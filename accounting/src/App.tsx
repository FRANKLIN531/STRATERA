import { useState, useEffect } from 'react';
import { Layout, Icons, LoginScreen, LoadingSpinner, ResetPasswordScreen, SignUpScreen } from '@stratera/shared';
import type { User } from '@stratera/shared';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { Invoices } from './pages/Invoices';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { getAccountingApi } from './api';
import { useActiveCurrency } from './hooks/useActiveCurrency';
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
  const [authScreen, setAuthScreen] = useState<'login' | 'reset' | 'signup'>('login');
  const [initialSetupPending, setInitialSetupPending] = useState(true);
  const [signUpVerificationEnabled, setSignUpVerificationEnabled] = useState(true);
  const api = getAccountingApi();
  const currency = useActiveCurrency();
  const Page = pages[activeNav];

  useEffect(() => {
    api.getCurrentUser().then((u) => {
      setUser(u);
      api.isInitialSetupPending().then(setInitialSetupPending);
      api.isSignUpVerificationEnabled().then(setSignUpVerificationEnabled).catch(() => setSignUpVerificationEnabled(false));
      setChecking(false);
    });
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const loggedIn = await api.login(email, password, 'accounting');
    if (loggedIn) {
      setUser(loggedIn);
      setInitialSetupPending(false);
    }
    return !!loggedIn;
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setAuthScreen('login');
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', background: '#001B3A' }}>
        <LoadingSpinner message="Starting STRATERA Accounting..." />
      </div>
    );
  }

  if (!user) {
    if (authScreen === 'reset') {
      return (
        <ResetPasswordScreen
          appTitle="STRATERA Accounting"
          onSendResetCode={(email) => api.sendPasswordResetCode(email)}
          onCompleteReset={(email, code, newPassword) =>
            api.completePasswordResetWithCode(email, code, newPassword)
          }
          onBack={() => setAuthScreen('login')}
        />
      );
    }

    if (authScreen === 'signup') {
      return (
        <SignUpScreen
          appTitle="STRATERA Accounting"
          appSubtitle="R&D SOFTWARE GROUP"
          moduleLabel="Accounting desktop"
          verificationEnabled={signUpVerificationEnabled}
          onSignUpStart={(input) => api.signUpStart({ ...input, appAccess: 'accounting' })}
          onSignUpComplete={(email, code) => api.signUpComplete(email, code)}
          onBack={() => setAuthScreen('login')}
          onSuccess={() => setAuthScreen('login')}
        />
      );
    }

    return (
      <LoginScreen
        appTitle="STRATERA Accounting"
        appSubtitle="R&D SOFTWARE GROUP"
        initialSetupPending={initialSetupPending}
        onLogin={handleLogin}
        onForgotPassword={() => setAuthScreen('reset')}
        onSignUp={() => setAuthScreen('signup')}
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
      <Page key={activeNav === 'settings' ? 'settings' : currency} />
    </Layout>
  );
}
