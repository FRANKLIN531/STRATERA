import { createHash } from 'node:crypto';
import type { DbClient } from './db-client';
import { normalizeEmail } from './validation';
import { sendPasswordResetEmail } from './mail';
import type { SmtpConfig } from './types';

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function nextId(db: DbClient): string {
  const row = db.prepare('SELECT COUNT(*) as c FROM password_reset_codes').get() as { c: number };
  return `PR-${String(row.c + 1).padStart(4, '0')}`;
}

export class PasswordResetVerification {
  constructor(private db: DbClient) {}

  ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
  }

  async prepareReset(
    userId: string,
    email: string,
    smtp: SmtpConfig,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    this.ensureTable();

    const normalized = normalizeEmail(email);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const sent = await sendPasswordResetEmail(normalized, code, smtp);
    if (!sent.ok) return sent;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    this.db.prepare('DELETE FROM password_reset_codes WHERE user_id = ?').run(userId);
    this.db.prepare(
      'INSERT INTO password_reset_codes (id, user_id, email, code_hash, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    ).run(nextId(this.db), userId, normalized, hashCode(code), expiresAt, createdAt);

    return { ok: true };
  }

  verifyAndConsume(
    userId: string,
    email: string,
    code: string,
  ): { ok: true } | { ok: false; error: string } {
    this.ensureTable();

    const normalized = normalizeEmail(email);
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      return { ok: false, error: 'Enter the 6-digit reset code from your email.' };
    }

    const row = this.db
      .prepare(
        'SELECT * FROM password_reset_codes WHERE user_id = ? AND email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
      )
      .get(userId, normalized) as Record<string, unknown> | undefined;

    if (!row) {
      return { ok: false, error: 'No reset request found. Send a new code from your email.' };
    }

    const expiresAt = new Date(row.expires_at as string);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return { ok: false, error: 'Reset code expired. Send a new code.' };
    }

    if (row.code_hash !== hashCode(trimmedCode)) {
      return { ok: false, error: 'Invalid reset code. Check your email and try again.' };
    }

    this.db.prepare('UPDATE password_reset_codes SET used = 1 WHERE id = ?').run(row.id as string);
    return { ok: true };
  }
}
