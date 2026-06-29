const STORAGE_KEY = 'stratera-phone-check-in-base';

/** Dev server port used by STRATERA (see app/vite.config.ts). */
const DEFAULT_PORT = '5190';

export function resolveAppBaseUrl(): string {
  const origin = window.location.origin;
  if (origin && origin.startsWith('http')) {
    return origin.replace(/\/$/, '');
  }
  const host = window.location.hostname || 'localhost';
  const port = window.location.port || DEFAULT_PORT;
  return `http://${host}:${port}`;
}

export function buildCheckInUrl(baseUrl: string, siteToken: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/check-in?site=${encodeURIComponent(siteToken)}`;
}

export function loadPhoneBaseUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function savePhoneBaseUrl(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value.trim());
  } catch {
    /* ignore */
  }
}

export function suggestedPhoneBaseUrl(): string {
  const base = resolveAppBaseUrl();
  if (!base.includes('localhost') && !base.includes('127.0.0.1')) {
    return base;
  }
  const port = window.location.port || DEFAULT_PORT;
  return `http://192.168.x.x:${port}`;
}

export function isLocalNetworkUrl(url: string): boolean {
  if (!url) return false;
  return !url.includes('localhost') && !url.includes('127.0.0.1');
}
