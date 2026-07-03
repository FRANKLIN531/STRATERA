export {
  ACCOUNTING_COMPANY_NAME_KEY as COMPANY_NAME_KEY,
  ACCOUNTING_COMPANY_ADDRESS_KEY as COMPANY_ADDRESS_KEY,
  ACCOUNTING_COMPANY_EMAIL_KEY as COMPANY_EMAIL_KEY,
  getAccountingCompanyName as getCompanyName,
  getAccountingCompanyAddress as getCompanyAddress,
  getAccountingCompanyEmail as getCompanyEmail,
} from '@stratera/shared';

export const FISCAL_YEAR_KEY = 'stratera-accounting-fiscal-year';

export function getFiscalYearStart(): string {
  try {
    return localStorage.getItem(FISCAL_YEAR_KEY)?.trim() || 'January';
  } catch {
    return 'January';
  }
}
