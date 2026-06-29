import { useEffect, useState, type ReactNode } from 'react';
import { ConfidentialPageGate } from '@stratera/shared';
import {
  CONFIDENTIAL_PAGE_META,
  type ConfidentialPageId,
  useConfidentialAccess,
} from '../context/ConfidentialAccessContext';

interface ProtectedHrPageProps {
  pageId: ConfidentialPageId;
  children: ReactNode;
  onCancel?: () => void;
}

export function ProtectedHrPage({ pageId, children, onCancel }: ProtectedHrPageProps) {
  const { isUnlocked, verifyAndUnlock } = useConfidentialAccess();
  const meta = CONFIDENTIAL_PAGE_META[pageId];
  const [unlocked, setUnlocked] = useState(() => isUnlocked(pageId));

  useEffect(() => {
    setUnlocked(isUnlocked(pageId));
  }, [isUnlocked, pageId]);

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <ConfidentialPageGate
      title={meta.title}
      description={meta.description}
      onVerify={async (password) => {
        const result = await verifyAndUnlock(pageId, password);
        if (result.ok) {
          setUnlocked(true);
        }
        return result;
      }}
      onCancel={onCancel}
    />
  );
}
