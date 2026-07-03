import { formatMoney } from '@stratera/shared';

/**
 * Format a monetary amount. When no explicit currency is passed, the active
 * (user-selected) accounting currency is used, so changing the currency in
 * Settings updates every amount across the desktop.
 */
export const formatCurrency = (n: number, currency?: string) => formatMoney(n, currency);
