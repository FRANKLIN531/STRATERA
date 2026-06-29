import type { AccountingApi } from '@stratera/shared';
import { createAccountingFallbackApi } from '@stratera/shared';

export function getAccountingApi(): AccountingApi {
  if (window.stratera?.accounting) return window.stratera.accounting;
  if (window.stratera?.api) return window.stratera.api as AccountingApi;
  return createAccountingFallbackApi();
}
