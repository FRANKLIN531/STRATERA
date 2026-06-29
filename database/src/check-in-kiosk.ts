import { normalizeEmail } from './validation';

/** Normalize phone to comparable digits (Ghana +233 / 0-prefix friendly). */
export function phoneDigits(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('233') && d.length >= 11) {
    d = `0${d.slice(3)}`;
  }
  if (d.length > 10) d = d.slice(-10);
  return d;
}

export function phonesMatch(stored: string, entered: string): boolean {
  const a = phoneDigits(stored);
  const b = phoneDigits(entered);
  if (!a || !b) return false;
  if (a === b) return true;
  const stripLeadingZero = (v: string) => (v.startsWith('0') ? v.slice(1) : v);
  if (stripLeadingZero(a) === stripLeadingZero(b)) return true;
  if (a.length >= 9 && b.length >= 9 && a.slice(-9) === b.slice(-9)) return true;
  return false;
}

export function matchEmployeeByPhone(
  rows: Record<string, unknown>[],
  phone: string,
): Record<string, unknown> | undefined {
  const entered = phone.trim();
  if (!entered) return undefined;
  return rows.find((row) => phonesMatch(String(row.phone ?? ''), entered));
}

export function matchEmployeeByEmail(
  rows: Record<string, unknown>[],
  email: string,
): Record<string, unknown> | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  return rows.find((row) => normalizeEmail(String(row.email ?? '')) === normalized);
}
