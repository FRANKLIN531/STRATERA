import { createContext, useContext } from 'react';

export const AccountingNavContext = createContext<(page: string) => void>(() => {});

export function useAccountingNav(): (page: string) => void {
  return useContext(AccountingNavContext);
}
