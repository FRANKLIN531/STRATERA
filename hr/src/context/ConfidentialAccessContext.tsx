import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@stratera/shared';
import { verifyUserPassword } from '../api';

export type ConfidentialPageId = 'salaries' | 'settings';

const UNLOCK_MS = 15 * 60 * 1000;
const STORAGE_PREFIX = 'stratera-hr-confidential';

function storageKey(userId: string, pageId: ConfidentialPageId): string {
  return `${STORAGE_PREFIX}-${userId}-${pageId}`;
}

function readUnlockExpiry(userId: string, pageId: ConfidentialPageId): number | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId, pageId));
    if (!raw) return null;
    const expiry = parseInt(raw, 10);
    if (Number.isNaN(expiry) || Date.now() >= expiry) {
      sessionStorage.removeItem(storageKey(userId, pageId));
      return null;
    }
    return expiry;
  } catch {
    return null;
  }
}

function writeUnlock(userId: string, pageId: ConfidentialPageId): void {
  try {
    sessionStorage.setItem(storageKey(userId, pageId), String(Date.now() + UNLOCK_MS));
  } catch {
    /* ignore */
  }
}

export function clearConfidentialAccess(userId?: string): void {
  const pages: ConfidentialPageId[] = ['salaries', 'settings'];
  try {
    if (userId) {
      for (const pageId of pages) {
        sessionStorage.removeItem(storageKey(userId, pageId));
      }
      return;
    }
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(`${STORAGE_PREFIX}-`)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

interface ConfidentialAccessContextValue {
  isUnlocked: (pageId: ConfidentialPageId) => boolean;
  unlock: (pageId: ConfidentialPageId) => void;
  verifyAndUnlock: (pageId: ConfidentialPageId, password: string) => Promise<{ ok: boolean; error?: string }>;
}

const ConfidentialAccessContext = createContext<ConfidentialAccessContextValue | null>(null);

export function ConfidentialAccessProvider({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const [, bump] = useState(0);

  const isUnlocked = useCallback(
    (pageId: ConfidentialPageId) => Boolean(readUnlockExpiry(user.id, pageId)),
    [user.id],
  );

  const unlock = useCallback(
    (pageId: ConfidentialPageId) => {
      writeUnlock(user.id, pageId);
      bump((n) => n + 1);
    },
    [user.id],
  );

  const verifyAndUnlock = useCallback(
    async (pageId: ConfidentialPageId, password: string) => {
      const result = await verifyUserPassword(password);
      if (result.ok) {
        unlock(pageId);
      }
      return result;
    },
    [unlock],
  );

  const value = useMemo(
    () => ({ isUnlocked, unlock, verifyAndUnlock }),
    [isUnlocked, unlock, verifyAndUnlock],
  );

  return (
    <ConfidentialAccessContext.Provider value={value}>
      {children}
    </ConfidentialAccessContext.Provider>
  );
}

export function useConfidentialAccess(): ConfidentialAccessContextValue {
  const ctx = useContext(ConfidentialAccessContext);
  if (!ctx) {
    throw new Error('useConfidentialAccess must be used within ConfidentialAccessProvider');
  }
  return ctx;
}

export const CONFIDENTIAL_PAGE_META: Record<
  ConfidentialPageId,
  { title: string; description: string }
> = {
  salaries: {
    title: 'Salaries are protected',
    description: 'Enter your sign-in password to view salary amounts and compensation details.',
  },
  settings: {
    title: 'Settings are protected',
    description: 'Enter your sign-in password to change organization settings and system configuration.',
  },
};

export function isConfidentialPage(pageId: string): pageId is ConfidentialPageId {
  return pageId === 'salaries' || pageId === 'settings';
}
