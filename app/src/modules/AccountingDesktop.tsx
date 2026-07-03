import { useState } from 'react';
import { Layout, Icons } from '@stratera/shared';
import type { User } from '@stratera/shared';
import { Dashboard } from '@accounting/pages/Dashboard';
import { Accounts } from '@accounting/pages/Accounts';
import { Transactions } from '@accounting/pages/Transactions';
import { Invoices } from '@accounting/pages/Invoices';
import { Reports } from '@accounting/pages/Reports';
import { Settings } from '@accounting/pages/Settings';
import { getAccountingApi } from '../api';
import { useActiveCurrency } from '@accounting/hooks/useActiveCurrency';
import { AccountingNavContext } from '@accounting/context/AccountingNavContext';
import '@accounting/styles/accounting-dashboard.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard /> },
  { id: 'accounts', label: 'Accounts', icon: <Icons.Accounts /> },
  { id: 'transactions', label: 'Transactions', icon: <Icons.Transactions /> },
  { id: 'invoices', label: 'Invoices', icon: <Icons.Invoices /> },
  { id: 'reports', label: 'Reports', icon: <Icons.Reports /> },
  { id: 'settings', label: 'Settings', icon: <Icons.Settings /> },
];

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  accounts: 'Accounts',
  transactions: 'Transactions',
  invoices: 'Invoices',
  reports: 'Reports',
  settings: 'Settings',
};

const pages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  accounts: Accounts,
  transactions: Transactions,
  invoices: Invoices,
  reports: Reports,
  settings: Settings,
};

interface AccountingDesktopProps {
  user: User;
  onLogout: () => void;
}

export function AccountingDesktop({ user, onLogout }: AccountingDesktopProps) {
  const [activeNav, setActiveNav] = useState('dashboard');
  const api = getAccountingApi();
  const currency = useActiveCurrency();
  const Page = pages[activeNav];

  const handleLogout = async () => {
    await api.logout();
    onLogout();
  };

  return (
    <AccountingNavContext.Provider value={setActiveNav}>
      <Layout
        appName={pageTitles[activeNav]}
        appSubtitle="ACCOUNTING"
        navItems={navItems}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        userName={user.name}
        onLogout={handleLogout}
      >
        <Page key={activeNav === 'settings' ? 'settings' : currency} />
      </Layout>
    </AccountingNavContext.Provider>
  );
}
