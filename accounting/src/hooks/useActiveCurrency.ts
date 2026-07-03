import { useEffect, useState } from 'react';
import { getActiveCurrency, HR_CURRENCY_CHANGED_EVENT } from '@stratera/shared';

/** Returns the active accounting currency and re-renders when it changes. */
export function useActiveCurrency(): string {
  const [currency, setCurrency] = useState(() => getActiveCurrency());

  useEffect(() => {
    const handler = () => setCurrency(getActiveCurrency());
    window.addEventListener(HR_CURRENCY_CHANGED_EVENT, handler as EventListener);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(HR_CURRENCY_CHANGED_EVENT, handler as EventListener);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return currency;
}
