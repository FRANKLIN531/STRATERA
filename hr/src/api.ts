import type { HrApi } from '@stratera/shared';

import { createHrFallbackApi } from '@stratera/shared';



let hrFallback: HrApi | null = null;

function getHrFallback(): HrApi {
  if (!hrFallback) hrFallback = createHrFallbackApi();
  return hrFallback;
}

/** Use native IPC when available; fall back if handler missing or method undefined. */
function mergeHrMethod<K extends keyof HrApi>(
  native: HrApi | undefined,
  key: K,
): HrApi[K] {
  const fallbackFn = getHrFallback()[key];
  const nativeFn = native?.[key];
  if (typeof nativeFn !== 'function') {
    return fallbackFn;
  }
  return (async (...args: unknown[]) => {
    try {
      return await (nativeFn as (...a: unknown[]) => unknown).apply(native, args);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('No handler registered') ||
        msg.includes('Error invoking remote method') ||
        msg.includes('is not a function')
      ) {
        return await (fallbackFn as (...a: unknown[]) => unknown).apply(getHrFallback(), args);
      }
      throw err;
    }
  }) as HrApi[K];
}

export function getHrApi(): HrApi {
  const native = window.stratera?.isElectron
    ? window.stratera.hr ?? (window.stratera.api as HrApi | undefined)
    : undefined;

  if (native && hasCredentialVerification(native)) {
    const fallback = getHrFallback();
    return {
      ...fallback,
      ...native,
      getKioskCheckInConfig: mergeHrMethod(native, 'getKioskCheckInConfig'),
      regenerateCheckInSiteToken: mergeHrMethod(native, 'regenerateCheckInSiteToken'),
      lookupCheckIn: mergeHrMethod(native, 'lookupCheckIn'),
      confirmCheckIn: mergeHrMethod(native, 'confirmCheckIn'),
      getAttendanceScanLog: mergeHrMethod(native, 'getAttendanceScanLog'),
      cancelLeaveRequest: mergeHrMethod(native, 'cancelLeaveRequest'),
      approveLeaveManager: mergeHrMethod(native, 'approveLeaveManager'),
      approveLeaveHr: mergeHrMethod(native, 'approveLeaveHr'),
      createLeaveRequest: mergeHrMethod(native, 'createLeaveRequest'),
      updateLeaveRequest: mergeHrMethod(native, 'updateLeaveRequest'),
      deleteLeaveRequest: mergeHrMethod(native, 'deleteLeaveRequest'),
    };
  }

  return getHrFallback();
}

function hasCredentialVerification(api: {
  sendCredentialEmailVerification?: unknown;
  verifyCredentialEmailCode?: unknown;
}): boolean {
  return (
    typeof api.sendCredentialEmailVerification === 'function' &&
    typeof api.verifyCredentialEmailCode === 'function'
  );
}

export function isHrDatabaseConnected(): boolean {
  const native = window.stratera?.isElectron
    ? window.stratera.hr ?? (window.stratera.api as HrApi | undefined)
    : undefined;
  return Boolean(native && hasCredentialVerification(native));
}

/** Verify the signed-in user's password for confidential HR pages. */
export async function verifyUserPassword(
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const api = getHrApi();

  if (typeof api.verifyPassword === 'function') {
    try {
      const result = await api.verifyPassword(password);
      return result ?? { ok: false, error: 'Verification failed.' };
    } catch (err) {
      const msg = verificationErrorMessage(err);
      const ipcUnavailable =
        msg.includes('No handler registered') ||
        msg.includes('Error invoking remote method') ||
        msg.includes('auth:verifyPassword');
      if (!ipcUnavailable) {
        return { ok: false, error: msg };
      }
    }
  }

  try {
    const user = await api.getCurrentUser();
    if (!user) {
      return { ok: false, error: 'You must be signed in to continue.' };
    }
    if (!password.trim()) {
      return { ok: false, error: 'Enter your password to continue.' };
    }
    const verified = await api.login(user.email, password, 'hr');
    if (!verified) {
      return { ok: false, error: 'Incorrect password.' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: verificationErrorMessage(err) };
  }
}



function verificationErrorMessage(err: unknown): string {

  const msg = err instanceof Error ? err.message : String(err ?? '');

  if (!msg) return 'Unable to verify password. Try again.';

  if (msg.includes('verifyPassword') && msg.includes('not a function')) {
    return 'Password verification is unavailable. Close STRATERA completely and restart start-stratera.bat.';
  }

  if (msg.includes('No handler registered') || msg.includes('Error invoking remote method')) {

    return 'STRATERA database is not connected. Restart start-stratera.bat and use the STRATERA desktop window.';

  }

  return msg;

}



export function getAuthApi() {

  const api = getHrApi();

  return {

    login: api.login,

    logout: api.logout,

    getCurrentUser: api.getCurrentUser,

    isInitialSetupPending: api.isInitialSetupPending,

    sendPasswordResetCode: async (email) => {
      try {
        const result = await api.sendPasswordResetCode(email);
        return result ?? { ok: false as const, error: 'Could not send reset code.' };
      } catch (err) {
        return { ok: false as const, error: verificationErrorMessage(err) };
      }
    },

    completePasswordResetWithCode: async (email, code, newPassword) => {
      try {
        const result = await api.completePasswordResetWithCode(email, code, newPassword);
        return result ?? { ok: false as const, error: 'Could not reset password.' };
      } catch (err) {
        return { ok: false as const, error: verificationErrorMessage(err) };
      }
    },

    completeCredentialUpdate: async (email, newPassword) => {
      try {
        return await api.completeCredentialUpdate(email, newPassword);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unable to save credentials.');
      }
    },

    sendCredentialEmailVerification: async (email: string, smtp) => {

      try {

        const result = await api.sendCredentialEmailVerification(email, smtp);

        return result ?? { ok: false as const, error: 'Verification failed.' };

      } catch (err) {

        return { ok: false as const, error: verificationErrorMessage(err) };

      }

    },

    verifyCredentialEmailCode: async (email: string, code: string) => {

      try {

        const result = await api.verifyCredentialEmailCode(email, code);

        return result ?? { ok: false as const, error: 'Verification failed.' };

      } catch (err) {

        return { ok: false as const, error: verificationErrorMessage(err) };

      }

    },

  };

}


