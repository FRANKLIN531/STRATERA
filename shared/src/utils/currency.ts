export const HR_CURRENCY_OPTIONS = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'GHS', label: 'Ghanaian Cedi (GHS)' },
  { code: 'NGN', label: 'Nigerian Naira (NGN)' },
  { code: 'KES', label: 'Kenyan Shilling (KES)' },
  { code: 'ZAR', label: 'South African Rand (ZAR)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
] as const;

export const HR_CURRENCY_STORAGE_KEY = 'stratera-hr-currency';
const HR_SETTINGS_STORAGE_KEY = 'stratera-dev-hr-settings';
export const HR_CURRENCY_CHANGED_EVENT = 'stratera-hr-currency-changed';

const CURRENCY_LOCALE: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  GHS: 'en-GH',
  NGN: 'en-NG',
  KES: 'en-KE',
  ZAR: 'en-ZA',
  CAD: 'en-CA',
  AUD: 'en-AU',
  INR: 'en-IN',
};

function readStoredCurrency(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const direct = localStorage.getItem(HR_CURRENCY_STORAGE_KEY);
    if (direct?.trim()) return direct.trim();
    const settingsRaw = localStorage.getItem(HR_SETTINGS_STORAGE_KEY);
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw) as { currency?: string };
      if (parsed.currency?.trim()) return parsed.currency.trim();
    }
  } catch {
    return null;
  }
  return null;
}

function writeStoredCurrency(code: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(HR_CURRENCY_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

function notifyCurrencyChanged(code: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HR_CURRENCY_CHANGED_EVENT, { detail: code }));
}

export function getStoredCurrency(): string | null {
  return readStoredCurrency();
}

export function getActiveCurrency(): string {
  return readStoredCurrency() || 'USD';
}

export function setActiveCurrency(code: string): void {
  const next = code?.trim() || 'USD';
  writeStoredCurrency(next);
  notifyCurrencyChanged(next);
}

export function formatMoney(amount: number, currency?: string): string {
  const code = currency?.trim() || getActiveCurrency();
  const locale = CURRENCY_LOCALE[code] ?? 'en-US';
  try {
    return amount.toLocaleString(locale, { style: 'currency', currency: code });
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function currencyLabel(code: string): string {
  return HR_CURRENCY_OPTIONS.find((c) => c.code === code)?.label ?? code;
}

export function resolveCurrencyCode(fromApi?: string | null, fromLocal?: string | null): string {
  const local = fromLocal?.trim() || readStoredCurrency();
  const api = fromApi?.trim();
  return local || api || 'USD';
}
