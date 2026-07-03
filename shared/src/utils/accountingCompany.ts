export const ACCOUNTING_COMPANY_NAME_KEY = 'stratera-accounting-company-name';
export const ACCOUNTING_COMPANY_ADDRESS_KEY = 'stratera-accounting-company-address';
export const ACCOUNTING_COMPANY_EMAIL_KEY = 'stratera-accounting-company-email';

function read(key: string, fallback = ''): string {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    return localStorage.getItem(key)?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export function getAccountingCompanyName(): string {
  return read(ACCOUNTING_COMPANY_NAME_KEY, 'STRATERA R&D Software Group');
}

export function getAccountingCompanyAddress(): string {
  return read(ACCOUNTING_COMPANY_ADDRESS_KEY);
}

export function getAccountingCompanyEmail(): string {
  return read(ACCOUNTING_COMPANY_EMAIL_KEY);
}
