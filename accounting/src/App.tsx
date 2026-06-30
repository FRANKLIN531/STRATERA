import { useState, useEffect } from 'react';
import { Layout, Icons, LoginScreen, LoadingSpinner } from '@stratera/shared';
import type { User } from '@stratera/shared';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { Invoices } from './pages/Invoices';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { getAccountingApi } from './api';
import './styles/accounting-dashboard.css';

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

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [initialSetupPending, setInitialSetupPending] = useState(true);
  const api = getAccountingApi();
  const Page = pages[activeNav];

  useEffect(() => {
    api.getCurrentUser().then((u) => {
      setUser(u);
      api.isInitialSetupPending().then(setInitialSetupPending);
      setChecking(false);
    });
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const loggedIn = await api.login(email, password, 'accounting');
    if (loggedIn) {
      setUser(loggedIn);
      if (!loggedIn.requiresCredentialUpdate) setInitialSetupPending(false);
    }
    return !!loggedIn;
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', background: '#001B3A' }}>
        <LoadingSpinner message="Starting STRATERA Accounting..." />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        appTitle="STRATERA Accounting"
        appSubtitle="R&D SOFTWARE GROUP"
        initialSetupPending={initialSetupPending}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <Layout
      appName={pageTitles[activeNav]}
      appSubtitle="ACCOUNTING"
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      userName={user.name}
      onLogout={handleLogout}
    >
      <Page />
    </Layout>
  );
}
