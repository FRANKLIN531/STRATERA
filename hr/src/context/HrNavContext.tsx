import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import type { HrNavState } from '@stratera/shared';

interface HrNavContextValue {
  navState: HrNavState;
  navigate: (page: string, state?: HrNavState) => void;
}

const HrNavContext = createContext<HrNavContextValue | null>(null);

export function HrNavProvider({
  activeNav,
  onNavChange,
  children,
}: {
  activeNav: string;
  onNavChange: (id: string) => void;
  children: ReactNode;
}) {
  const [navState, setNavState] = useState<HrNavState>({});

  const navigate = useCallback(
    (page: string, state?: HrNavState) => {
      setNavState(state ?? {});
      onNavChange(page);
    },
    [onNavChange],
  );

  return (
    <HrNavContext.Provider value={{ navState, navigate }}>
      {children}
    </HrNavContext.Provider>
  );
}

export function useHrNav() {
  const ctx = useContext(HrNavContext);
  if (!ctx) throw new Error('useHrNav must be used within HrNavProvider');
  return ctx;
}

export function useHrNavState() {
  const ctx = useContext(HrNavContext);
  return ctx?.navState ?? {};
}
