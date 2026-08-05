import type { AccountingApi, HrApi } from './types';

const DESKTOP_API_PORT = '5192';

const AUTH_METHODS = new Set([
  'login',
  'logout',
  'getCurrentUser',
  'verifyPassword',
  'isInitialSetupPending',
  'sendPasswordResetCode',
  'completePasswordResetWithCode',
  'completeCredentialUpdate',
  'sendCredentialEmailVerification',
  'verifyCredentialEmailCode',
  'isSignUpVerificationEnabled',
  'signUpStart',
  'signUpComplete',
]);

let reachCache: { ok: boolean; checkedAt: number } | null = null;
const REACH_TTL_MS = 4000;

export function desktopApiBaseUrl(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
  return `http://${host}:${DESKTOP_API_PORT}`;
}

export async function canReachDesktopApi(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force && reachCache && now - reachCache.checkedAt < REACH_TTL_MS) {
    return reachCache.ok;
  }
  try {
    const base = desktopApiBaseUrl();
    let res = await fetch(`${base}/api/health`, { method: 'GET' });
    if (!res.ok) {
      res = await fetch(`${base}/api/kiosk/health`, { method: 'GET' });
    }
    const ok = res.ok;
    reachCache = { ok, checkedAt: now };
    return ok;
  } catch {
    reachCache = { ok: false, checkedAt: now };
    return false;
  }
}

export function invalidateDesktopApiReachCache(): void {
  reachCache = null;
}

export async function desktopRpc<T = unknown>(method: string, args: unknown[] = []): Promise<T> {
  const res = await fetch(`${desktopApiBaseUrl()}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const payload = (await res.json()) as { ok?: boolean; result?: T; error?: string };
  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || `Desktop API error (${res.status})`);
  }
  return payload.result as T;
}

function rpcName(scope: 'hr' | 'accounting', prop: string): string {
  if (AUTH_METHODS.has(prop)) return `auth.${prop}`;
  return `${scope}.${prop}`;
}

function createScopedDesktopProxy<T extends object>(scope: 'hr' | 'accounting', fallback: T): T {
  return new Proxy(fallback, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string') return Reflect.get(target, prop, receiver);
      const fallbackFn = Reflect.get(target, prop, receiver);
      if (typeof fallbackFn !== 'function') return fallbackFn;

      return async (...args: unknown[]) => {
        try {
          if (await canReachDesktopApi()) {
            const result = await desktopRpc(rpcName(scope, prop), args);
            if (prop === 'emailInvoice' && result && typeof result === 'object' && 'mailto' in result) {
              const mailto = String((result as { mailto?: string }).mailto ?? '');
              if (mailto && typeof window !== 'undefined') window.location.href = mailto;
              return true;
            }
            return result;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // Unknown method or desktop restarted mid-call → fall back for that call.
          if (!msg.includes('Desktop API') && !msg.includes('Failed to fetch') && !msg.includes('NetworkError')) {
            throw err;
          }
          invalidateDesktopApiReachCache();
        }
        return (fallbackFn as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  }) as T;
}

/** Browser HR API that prefers the running desktop SQL database (port 5192). */
export function createDesktopBackedHrApi(fallback: HrApi): HrApi {
  return createScopedDesktopProxy('hr', fallback);
}

/** Browser Accounting API that prefers the running desktop SQL database (port 5192). */
export function createDesktopBackedAccountingApi(fallback: AccountingApi): AccountingApi {
  return createScopedDesktopProxy('accounting', fallback);
}
