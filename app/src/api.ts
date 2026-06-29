import type { AccountingApi, HrApi } from '@stratera/shared';

import { createAccountingFallbackApi, createHrFallbackApi } from '@stratera/shared';



let accountingFallback: AccountingApi | null = null;

let hrFallback: HrApi | null = null;



function hasCredentialVerification(api: {

  sendCredentialEmailVerification?: unknown;

  verifyCredentialEmailCode?: unknown;

}): boolean {

  return (

    typeof api.sendCredentialEmailVerification === 'function' &&

    typeof api.verifyCredentialEmailCode === 'function'

  );

}



export function getAccountingApi(): AccountingApi {

  const native = window.stratera?.isElectron ? window.stratera.accounting : undefined;

  if (native && hasCredentialVerification(native)) return native;

  if (!accountingFallback) accountingFallback = createAccountingFallbackApi();

  return accountingFallback;

}



export function getHrApi(): HrApi {
  const native = window.stratera?.isElectron ? window.stratera.hr : undefined;

  if (native && hasCredentialVerification(native)) {
    const fallback = hrFallback ?? createHrFallbackApi();
    if (!hrFallback) hrFallback = fallback;
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

  if (!hrFallback) hrFallback = createHrFallbackApi();
  return hrFallback;
}

function mergeHrMethod<K extends keyof HrApi>(native: HrApi, key: K): HrApi[K] {
  const fallbackFn = (hrFallback ?? createHrFallbackApi())[key];
  const nativeFn = native[key];
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
        msg.includes('Error invoking remote method')
      ) {
        return await (fallbackFn as (...a: unknown[]) => unknown).apply(
          hrFallback ?? createHrFallbackApi(),
          args,
        );
      }
      throw err;
    }
  }) as HrApi[K];
}



function verificationErrorMessage(err: unknown): string {

  const msg = err instanceof Error ? err.message : String(err ?? '');

  if (!msg) return 'Unable to generate verification code. Try again.';

  if (msg.includes('No handler registered') || msg.includes('Error invoking remote method')) {

    return 'STRATERA database is not connected. Restart start-stratera.bat and use the STRATERA desktop window.';

  }

  return msg;

}



export function getAuthApi(module: 'accounting' | 'hr') {

  const api = module === 'accounting' ? getAccountingApi() : getHrApi();

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


