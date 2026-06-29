import type { ReactNode } from 'react';
import type { User } from '@stratera/shared';
import {
  ConfidentialAccessProvider,
  isConfidentialPage,
} from '../context/ConfidentialAccessContext';
import { ProtectedHrPage } from './ProtectedHrPage';

type PageMap = Record<string, React.ComponentType>;

interface HrAppShellProps {
  user: User;
  activeNav: string;
  onNavChange: (navId: string) => void;
  pages: PageMap;
}

function HrActivePage({
  activeNav,
  onNavChange,
  pages,
}: {
  activeNav: string;
  onNavChange: (navId: string) => void;
  pages: PageMap;
}) {
  const Page = pages[activeNav];
  if (!Page) return null;

  if (isConfidentialPage(activeNav)) {
    return (
      <ProtectedHrPage pageId={activeNav} onCancel={() => onNavChange('dashboard')}>
        <Page />
      </ProtectedHrPage>
    );
  }

  return <Page />;
}

export function HrAppShell({ user, activeNav, onNavChange, pages }: HrAppShellProps) {
  return (
    <ConfidentialAccessProvider user={user}>
      <HrActivePage activeNav={activeNav} onNavChange={onNavChange} pages={pages} />
    </ConfidentialAccessProvider>
  );
}
