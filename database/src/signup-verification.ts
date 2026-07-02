import { createHash } from 'node:crypto';
import type { DbClient } from './db-client';
import { normalizeEmail } from './validation';
import { verifyEmailDeliverable, mapDeliverableError } from './email-verify';
import { sendVerificationEmail } from './mail';
import { getSendGridConfig, sendSignupVerificationViaSendGrid } from './sendgrid-mail';
import type { SmtpConfig } from './types';

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function nextId(db: DbClient): string {
  const row = db.prepare('SELECT COUNT(*) as c FROM signup_pending').get() as { c: number };
  return `SU-${String(row.c + 1).padStart(4, '0')}`;
}

export interface SignUpPendingInput {
  name: string;
  email: string;
  password: string;
  appAccess: 'both' | 'accounting' | 'hr';
}

export class SignUpVerification {
  constructor(private db: DbClient) {}

  ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS signup_pending (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        app_access TEXT NOT NULL DEFAULT 'both',
        code_hash TEXT,
        expires_at TEXT,
        verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
  }

  isVerificationConfigured(smtp: SmtpConfig | null): boolean {
    return Boolean(getSendGridConfig() || smtp);
  }

  async startSignUp(
    input: SignUpPendingInput,
    smtp: SmtpConfig | null,
  ): Promise<{ ok: true; needsVerification: boolean } | { ok: false; error: string }> {
    this.ensureTable();

    const normalized = normalizeEmail(input.email);
    const name = input.name.trim();
    if (name.length < 2) return { ok: false, error: 'Enter your full name.' };
    if (input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (input.password === 'admin123') {
      return { ok: false, error: 'Choose a personal password — the default demo password cannot be used.' };
    }

    const duplicate = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(normalized) as { id: string } | undefined;
    if (duplicate) {
      return { ok: false, error: 'An account with this email already exists. Sign in instead.' };
    }

    const deliverable = await verifyEmailDeliverable(normalized);
    if (!deliverable.ok) {
      return { ok: false, error: mapDeliverableError(deliverable.reason) };
    }

    const passwordHash = hashPassword(input.password);
    const createdAt = new Date().toISOString();
    this.db.prepare('DELETE FROM signup_pending WHERE email = ?').run(normalized);

    const sendGrid = getSendGridConfig();
    const canVerify = Boolean(sendGrid || smtp);

    if (!canVerify) {
      return { ok: true, needsVerification: false };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    let sent: { ok: true } | { ok: false; error: string };

    if (sendGrid) {
      sent = await sendSignupVerificationViaSendGrid(normalized, code);
    } else if (smtp) {
      sent = await sendVerificationEmail(normalized, code, smtp);
    } else {
      return { ok: true, needsVerification: false };
    }

    if (!sent.ok) return sent;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    this.db.prepare(
      `INSERT INTO signup_pending (id, email, name, password_hash, app_access, code_hash, expires_at, verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    ).run(
      nextId(this.db),
      normalized,
      name,
      passwordHash,
      input.appAccess,
      hashCode(code),
      expiresAt,
      createdAt,
    );

    return { ok: true, needsVerification: true };
  }

  storePendingWithoutVerification(input: SignUpPendingInput): void {
    this.ensureTable();
    const normalized = normalizeEmail(input.email);
    const createdAt = new Date().toISOString();
    this.db.prepare('DELETE FROM signup_pending WHERE email = ?').run(normalized);
    this.db.prepare(
      `INSERT INTO signup_pending (id, email, name, password_hash, app_access, code_hash, expires_at, verified, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, 1, ?)`,
    ).run(
      nextId(this.db),
      normalized,
      input.name.trim(),
      hashPassword(input.password),
      input.appAccess,
      createdAt,
    );
  }

  verifyAndCreateUser(
    email: string,
    code: string,
    createUser: (pending: {
      name: string;
      email: string;
      passwordHash: string;
      appAccess: 'both' | 'accounting' | 'hr';
    }) => void,
  ): { ok: true } | { ok: false; error: string } {
    this.ensureTable();
    const normalized = normalizeEmail(email);
    const trimmedCode = code.trim();

    const row = this.db
      .prepare('SELECT * FROM signup_pending WHERE email = ? ORDER BY created_at DESC LIMIT 1')
      .get(normalized) as Record<string, unknown> | undefined;

    if (!row) {
      return { ok: false, error: 'No sign-up request found. Start again from Create account.' };
    }

    if (row.verified === 1 || row.verified === '1') {
      createUser({
        name: row.name as string,
        email: normalized,
        passwordHash: row.password_hash as string,
        appAccess: row.app_access as 'both' | 'accounting' | 'hr',
      });
      this.db.prepare('DELETE FROM signup_pending WHERE id = ?').run(row.id as string);
      return { ok: true };
    }

    if (!/^\d{6}$/.test(trimmedCode)) {
      return { ok: false, error: 'Enter the 6-digit code from your email.' };
    }

    const expiresAt = new Date(row.expires_at as string);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return { ok: false, error: 'Verification code expired. Start sign-up again.' };
    }

    if (row.code_hash !== hashCode(trimmedCode)) {
      return { ok: false, error: 'Invalid verification code. Check your email and try again.' };
    }

    createUser({
      name: row.name as string,
      email: normalized,
      passwordHash: row.password_hash as string,
      appAccess: row.app_access as 'both' | 'accounting' | 'hr',
    });
    this.db.prepare('DELETE FROM signup_pending WHERE id = ?').run(row.id as string);
    return { ok: true };
  }

  finalizeImmediateSignUp(input: SignUpPendingInput): void {
    this.storePendingWithoutVerification(input);
  }
}
