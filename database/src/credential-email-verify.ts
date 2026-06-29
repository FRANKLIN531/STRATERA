import { createHash } from 'node:crypto';
import type { DbClient } from './db-client';
import { normalizeEmail } from './validation';
import { verifyEmailDeliverable, mapDeliverableError } from './email-verify';
import { sendVerificationEmail, isSmtpConfigComplete } from './mail';
import type { SmtpConfig } from './types';

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function nextId(db: DbClient): string {
  const row = db.prepare('SELECT COUNT(*) as c FROM email_verifications').get() as { c: number };
  return `EV-${String(row.c + 1).padStart(4, '0')}`;
}

export class CredentialEmailVerification {
  constructor(private db: DbClient) {}

  ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
  }

  async prepareVerification(
    userId: string,
    email: string,
    smtp: SmtpConfig,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    this.ensureTable();
    const smtpCheck = isSmtpConfigComplete(smtp);
    if (!smtpCheck.ok) return smtpCheck;

    const normalized = normalizeEmail(email);
    const duplicate = this.db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(normalized, userId) as { id: string } | undefined;
    if (duplicate) {
      return { ok: false, error: 'An account with that email already exists.' };
    }

    const deliverable = await verifyEmailDeliverable(normalized);
    if (!deliverable.ok) {
      return { ok: false, error: mapDeliverableError(deliverable.reason) };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const sent = await sendVerificationEmail(normalized, code, smtp);
    if (!sent.ok) return sent;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    this.db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(userId);
    this.db.prepare(
      'INSERT INTO email_verifications (id, user_id, email, code_hash, expires_at, verified, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    ).run(nextId(this.db), userId, normalized, hashCode(code), expiresAt, createdAt);

    return { ok: true };
  }

  verifyCode(userId: string, email: string, code: string): { ok: boolean; error?: string } {
    const normalized = normalizeEmail(email);
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      return { ok: false, error: 'Enter the 6-digit verification code from your email.' };
    }

    const row = this.db
      .prepare('SELECT * FROM email_verifications WHERE user_id = ? AND email = ? ORDER BY created_at DESC LIMIT 1')
      .get(userId, normalized) as Record<string, unknown> | undefined;

    if (!row) {
      return { ok: false, error: 'Please verify your email address before continuing.' };
    }

    if (row.verified === 1 || row.verified === '1') {
      return { ok: true };
    }

    const expiresAt = new Date(row.expires_at as string);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return { ok: false, error: 'Verification code expired. Send a new code.' };
    }

    if (row.code_hash !== hashCode(trimmedCode)) {
      return { ok: false, error: 'Invalid verification code. Check your email and try again.' };
    }

    this.db.prepare('UPDATE email_verifications SET verified = 1 WHERE id = ?').run(row.id as string);
    return { ok: true };
  }

  isVerified(userId: string, email: string): boolean {
    const normalized = normalizeEmail(email);
    const row = this.db
      .prepare(
        'SELECT verified FROM email_verifications WHERE user_id = ? AND email = ? AND verified = 1 ORDER BY created_at DESC LIMIT 1',
      )
      .get(userId, normalized) as { verified: number } | undefined;
    return Boolean(row);
  }
}
