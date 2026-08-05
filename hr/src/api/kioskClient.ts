import type {
  CheckInConfirmInput,
  CheckInConfirmResult,
  CheckInLookupInput,
  CheckInLookupResult,
  HrApi,
  KioskCheckInConfig,
} from '@stratera/shared';
import { createHrFallbackApi } from '@stratera/shared';
import { getHrApi } from '../api';

const KIOSK_HTTP_PORT = '5192';
const DEV_KIOSK_TOKEN = 'DEV-KIOSK-TOKEN';

function isElectron(): boolean {
  return Boolean(window.stratera?.isElectron);
}

function nativeHr(): HrApi | undefined {
  return window.stratera?.hr ?? (window.stratera?.api as HrApi | undefined);
}

export function kioskHttpBaseUrl(): string {
  const host = window.location.hostname || 'localhost';
  return `http://${host}:${KIOSK_HTTP_PORT}`;
}

export function isDemoKioskToken(token: string | undefined): boolean {
  return !token || token === DEV_KIOSK_TOKEN;
}

async function fetchKiosk<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${kioskHttpBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const fromJson =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: unknown }).error ?? '')
        : '';
    throw new Error(fromJson || text?.slice(0, 200) || `Kiosk API error (${res.status})`);
  }
  return (payload ?? {}) as T;
}

async function canReachKioskHttp(): Promise<boolean> {
  try {
    const res = await fetch(`${kioskHttpBaseUrl()}/api/kiosk/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

function offlineAttendanceError(): CheckInLookupResult {
  return {
    ok: false,
    error:
      'Cannot reach the STRATERA attendance service. Keep the STRATERA desktop app open on the office computer, then try again.',
  };
}

function isMissingHandlerError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /No handler registered|Error invoking remote method|is not a function/i.test(msg);
}

/** Prefer Electron DB; on phone browsers use local kiosk HTTP API (port 5192). */
export async function getKioskCheckInConfig(baseUrl: string): Promise<KioskCheckInConfig> {
  const hr = nativeHr();
  if (isElectron() && typeof hr?.getKioskCheckInConfig === 'function') {
    try {
      const cfg = await hr.getKioskCheckInConfig(baseUrl);
      if (!isDemoKioskToken(cfg.siteToken)) return cfg;
    } catch {
      /* try HTTP */
    }
  }

  if (await canReachKioskHttp()) {
    const q = new URLSearchParams({ baseUrl });
    const cfg = await fetchKiosk<KioskCheckInConfig & { apiBaseUrl?: string }>(
      `/api/kiosk/config?${q.toString()}`,
    );
    return cfg;
  }

  const fallback = createHrFallbackApi();
  return fallback.getKioskCheckInConfig(baseUrl);
}

export async function lookupCheckIn(input: CheckInLookupInput): Promise<CheckInLookupResult> {
  const hr = nativeHr();
  // Always prefer the live desktop database when running inside Electron.
  if (isElectron() && typeof hr?.lookupCheckIn === 'function') {
    try {
      return await hr.lookupCheckIn(input);
    } catch (err) {
      if (!isMissingHandlerError(err)) throw err;
    }
  }

  if (await canReachKioskHttp()) {
    return fetchKiosk<CheckInLookupResult>('/api/kiosk/lookup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // Real QR tokens must talk to the office desktop — never an empty in-memory demo list.
  if (!isDemoKioskToken(input.siteToken)) {
    return offlineAttendanceError();
  }

  return getHrApi().lookupCheckIn(input);
}

export async function confirmCheckIn(input: CheckInConfirmInput): Promise<CheckInConfirmResult> {
  const hr = nativeHr();
  if (isElectron() && typeof hr?.confirmCheckIn === 'function') {
    try {
      return await hr.confirmCheckIn(input);
    } catch (err) {
      if (!isMissingHandlerError(err)) throw err;
    }
  }

  if (await canReachKioskHttp()) {
    return fetchKiosk<CheckInConfirmResult>('/api/kiosk/confirm', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  if (!isDemoKioskToken(input.siteToken)) {
    return {
      ok: false,
      error:
        'Cannot reach the STRATERA attendance service. Keep the STRATERA desktop app open on the office computer, then try again.',
    };
  }

  return getHrApi().confirmCheckIn(input);
}

export async function regenerateCheckInSiteToken(baseUrl: string): Promise<KioskCheckInConfig> {
  const hr = nativeHr();
  if (isElectron() && typeof hr?.regenerateCheckInSiteToken === 'function') {
    return hr.regenerateCheckInSiteToken(baseUrl);
  }
  throw new Error('Regenerate QR is only available in the STRATERA desktop app.');
}

export async function getAttendanceScanLog(limit = 30) {
  return getHrApi().getAttendanceScanLog(limit);
}
