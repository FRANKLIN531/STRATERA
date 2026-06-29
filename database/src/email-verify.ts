import dns from 'node:dns/promises';
import { isWorkEmail, normalizeEmail } from './validation';

export type EmailVerifyResult = { ok: true } | { ok: false; reason: string; code?: 'invalid' | 'domain' };

const INVALID_DOMAINS = new Set([
  'gmail.comm', 'gmail.comn', 'gmail.co', 'gmail.cm', 'gmaill.com', 'gmaiil.com',
  'gmial.com', 'gmai.com', 'gnail.com', 'yahoo.comm', 'yaho.com',
  'hotmail.comm', 'outlook.comm', 'outlok.com', 'icloud.comm', 'protonmail.comm',
]);

const INVALID_TLDS = new Set([
  'comm', 'comn', 'coom', 'con', 'cpm', 'cmo', 'ogr', 'orgn', 'netn', 'gmai', 'gmial', 'gmaill',
]);

/** Well-known mail domains — typos within edit distance are rejected. */
const KNOWN_MAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com',
  'outlook.com', 'live.com', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com',
  'proton.me', 'aol.com', 'msn.com', 'zoho.com', 'yandex.com', 'gmx.com', 'mail.com',
];

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[rows - 1][cols - 1];
}

export function hasKnownEmailTypo(domain: string): boolean {
  const d = domain.toLowerCase();
  if (INVALID_DOMAINS.has(d)) return true;
  const tld = d.split('.').pop();
  if (tld && INVALID_TLDS.has(tld)) return true;
  if (KNOWN_MAIL_DOMAINS.includes(d)) return false;
  for (const known of KNOWN_MAIL_DOMAINS) {
    const dist = levenshtein(d, known);
    if (dist > 0 && dist <= 2) return true;
  }
  return false;
}

export function mapDeliverableError(reason: string): string {
  if (reason.includes('domain') || reason.includes('typo') || reason.includes('cannot receive')) {
    return 'This email domain does not exist.';
  }
  return 'This email address is invalid.';
}

/**
 * Verify email format and that the domain can receive mail (MX DNS lookup).
 */
export async function verifyEmailDeliverable(email: string): Promise<EmailVerifyResult> {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@') || normalized.startsWith('@') || normalized.endsWith('@')) {
    return { ok: false, reason: 'This email address is invalid.', code: 'invalid' };
  }
  if (!isWorkEmail(normalized)) {
    return { ok: false, reason: 'This email address is invalid.', code: 'invalid' };
  }

  const domain = normalized.split('@')[1];
  if (hasKnownEmailTypo(domain)) {
    return { ok: false, reason: 'This email domain does not exist.', code: 'domain' };
  }

  if (KNOWN_MAIL_DOMAINS.includes(domain.toLowerCase())) {
    return { ok: true };
  }

  try {
    const mx = await dns.resolveMx(domain);
    if (mx && mx.length > 0) return { ok: true };
  } catch {
    /* no MX */
  }

  try {
    await dns.resolve4(domain);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'This email domain does not exist.', code: 'domain' };
  }
}
