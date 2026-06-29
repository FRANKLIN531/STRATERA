/** Practical email validation — rejects junk like "@gmail.com" or incomplete addresses. */
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
  if (domain.includes('.-') || domain.includes('-.') || domain.startsWith('-') || domain.endsWith('-')) return false;

  const parts = domain.split('.');
  if (parts.length < 2) return false;
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
  if (hasKnownTypoInDomain(domain)) return false;

  return true;
}

const INVALID_DOMAINS = new Set([
  'gmail.comm',
  'gmail.comn',
  'gmail.co',
  'gmail.cm',
  'gmaill.com',
  'gmaiil.com',
  'gmial.com',
  'gmai.com',
  'gnail.com',
  'yahoo.comm',
  'yaho.com',
  'hotmail.comm',
  'outlook.comm',
  'outlok.com',
  'icloud.comm',
  'protonmail.comm',
]);

const INVALID_TLDS = new Set([
  'comm',
  'comn',
  'coom',
  'con',
  'cpm',
  'cmo',
  'ogr',
  'orgn',
  'netn',
  'gmai',
  'gmial',
  'gmaill',
]);

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

export function hasKnownTypoInDomain(domain: string): boolean {
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

export function isWorkEmail(email: string): boolean {
  if (!isValidEmail(email)) return false;
  const normalized = normalizeEmail(email);
  const [local] = normalized.split('@');
  if (!local || local.length < 3) return false;
  if (!/[a-z]/.test(local)) return false;
  if (DEMO_ACCOUNT_EMAILS.has(normalized)) return false;
  return true;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required.';
  if (!trimmed.includes('@') || trimmed.startsWith('@') || trimmed.endsWith('@')) {
    return 'Enter a complete email address (e.g. name@company.com).';
  }
  if (!isValidEmail(trimmed)) {
    return 'Enter a valid email address (e.g. name@company.com).';
  }
  return null;
}

export function validateWorkEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required.';
  if (!trimmed.includes('@') || trimmed.startsWith('@') || trimmed.endsWith('@')) {
    return 'Enter your full work email, including the part before @ (e.g. john.smith@company.com).';
  }
  const normalizedEarly = normalizeEmail(trimmed);
  const domainEarly = normalizedEarly.split('@')[1];
  if (domainEarly && hasKnownTypoInDomain(domainEarly)) {
    return 'This email domain does not exist. Check for typos (for example .com, not .coom or .comm).';
  }
  if (!isValidEmail(trimmed)) {
    return 'This email address is invalid.';
  }
  const normalized = normalizeEmail(trimmed);
  const [local] = normalized.split('@');
  if (!local || local.length < 3) {
    return 'Enter your full work email with at least 3 characters before @.';
  }
  if (!/[a-z]/.test(local)) {
    return 'Your email must include a name or username before the @ symbol.';
  }
  if (DEMO_ACCOUNT_EMAILS.has(normalized)) {
    return 'Use your personal work email — demo login emails cannot be used here.';
  }
  const domain = normalized.split('@')[1];
  if (hasKnownTypoInDomain(domain)) {
    return 'This email domain does not exist. Check for typos (for example .com, not .coom or .comm).';
  }
  return null;
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

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return 'Phone number is required.';
  if (!isValidPhone(trimmed)) {
    return 'Enter a valid phone number (at least 10 digits).';
  }
  return null;
}
