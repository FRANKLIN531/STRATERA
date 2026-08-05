import type { AccountingApi } from '@stratera/shared';
import { createAccountingFallbackApi, createDesktopBackedAccountingApi } from '@stratera/shared';

let accountingFallback: AccountingApi | null = null;
let accountingDesktopBacked: AccountingApi | null = null;

function getFallback(): AccountingApi {
  if (!accountingFallback) accountingFallback = createAccountingFallbackApi();
  return accountingFallback;
}

export function getAccountingApi(): AccountingApi {
  if (window.stratera?.isElectron && window.stratera.accounting) {
    return window.stratera.accounting;
  }
  if (window.stratera?.isElectron && window.stratera.api) {
    return window.stratera.api as AccountingApi;
  }
  if (!accountingDesktopBacked) {
    accountingDesktopBacked = createDesktopBackedAccountingApi(getFallback());
  }
  return accountingDesktopBacked;
}
