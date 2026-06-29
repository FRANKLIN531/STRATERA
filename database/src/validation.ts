const EMAIL_REGEX =

  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;



const DEMO_ACCOUNT_EMAILS = new Set([

  'admin@stratera.com',

  'hr@stratera.com',

  'accountant@stratera.com',

]);



export function isValidEmail(email: string): boolean {

  const trimmed = email.trim().toLowerCase();

  if (!trimmed || trimmed.length > 254) return false;

  if (!trimmed.includes('@') || trimmed.startsWith('@') || trimmed.endsWith('@')) return false;

  if (!EMAIL_REGEX.test(trimmed)) return false;

  const [local, domain] = trimmed.split('@');

  if (!local || !domain || local.length < 2 || local.length > 64) return false;

  if (local.includes('..') || domain.includes('..')) return false;

  const parts = domain.split('.');

  const tld = parts[parts.length - 1];

  return Boolean(tld && tld.length >= 2 && /^[a-zA-Z]+$/.test(tld));

}



export function isWorkEmail(email: string): boolean {

  if (!isValidEmail(email)) return false;

  const normalized = normalizeEmail(email);

  const [local] = normalized.split('@');

  if (!local || local.length < 3) return false;

  if (!/[a-z]/.test(local)) return false;

  if (DEMO_ACCOUNT_EMAILS.has(normalized)) return false;

  const domain = normalized.split('@')[1];
  if (domain === 'gmail.comm' || domain.endsWith('.comm') || domain.endsWith('.comn')) return false;

  return true;

}



export function normalizeEmail(email: string): string {

  return email.trim().toLowerCase();

}



export function isValidPhone(phone: string): boolean {

  const digits = phone.replace(/\D/g, '');

  return digits.length >= 10 && digits.length <= 15;

}



export function normalizePhone(phone: string): string {

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

  }

  if (digits.length === 11 && digits.startsWith('1')) {

    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;

  }

  return phone.trim();

}


