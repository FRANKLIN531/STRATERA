import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { HrSettings } from '@stratera/shared';
import {
  formatMoney,
  getActiveCurrency,
  getStoredCurrency,
  HR_CURRENCY_CHANGED_EVENT,
  resolveCurrencyCode,
  setActiveCurrency,
} from '@stratera/shared';
import { getHrApi } from '../api';

interface HrSettingsContextValue {
  settings: HrSettings | null;
  currency: string;
  formatCurrency: (amount: number) => string;
  reloadSettings: () => Promise<void>;
  applyCurrency: (code: string) => void;
}

const HrSettingsContext = createContext<HrSettingsContextValue | null>(null);

export function HrSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<HrSettings | null>(null);
  const [currencyTick, setCurrencyTick] = useState(0);

  const bumpCurrency = useCallback(() => {
    setCurrencyTick((tick) => tick + 1);
  }, []);

  const reloadSettings = useCallback(async () => {
    const next = await getHrApi().getSettings();
    const code = resolveCurrencyCode(next.currency, getStoredCurrency());
    setActiveCurrency(code);
    setSettings({ ...next, currency: code });
    bumpCurrency();
  }, [bumpCurrency]);

  useEffect(() => {
    reloadSettings();
  }, [reloadSettings]);

  useEffect(() => {
    const onCurrencyChanged = () => bumpCurrency();
    window.addEventListener(HR_CURRENCY_CHANGED_EVENT, onCurrencyChanged);
    return () => window.removeEventListener(HR_CURRENCY_CHANGED_EVENT, onCurrencyChanged);
  }, [bumpCurrency]);

  const applyCurrency = useCallback((code: string) => {
    const next = code?.trim() || 'USD';
    setActiveCurrency(next);
    setSettings((prev) => (prev ? { ...prev, currency: next } : prev));
    bumpCurrency();
  }, [bumpCurrency]);

  const currency = settings?.currency?.trim() || getActiveCurrency();

  const formatCurrency = useCallback(
    (amount: number) => formatMoney(amount),
    [currency, currencyTick],
  );

  const value = useMemo(
    () => ({ settings, currency, formatCurrency, reloadSettings, applyCurrency }),
    [settings, currency, formatCurrency, reloadSettings, applyCurrency],
  );

  return (
    <HrSettingsContext.Provider value={value}>
      {children}
    </HrSettingsContext.Provider>
  );
}

export function useHrCurrency() {
  const ctx = useContext(HrSettingsContext);
  if (!ctx) {
    throw new Error('useHrCurrency must be used within HrSettingsProvider');
  }
  return ctx;
}

export function useHrSettings() {
  return useHrCurrency();
}
