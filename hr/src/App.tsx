import { useState, useEffect } from 'react';
import { Layout, Icons, LoginScreen, LoadingSpinner, ResetPasswordScreen, SignUpScreen } from '@stratera/shared';
import type { User } from '@stratera/shared';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Salaries } from './pages/Salaries';
import { Attendance } from './pages/Attendance';
import { Leave } from './pages/Leave';
import { Departments } from './pages/Departments';
import { Reports } from './pages/Reports';
import { Messages } from './pages/Messages';
import { Settings } from './pages/Settings';
import { getHrApi, getAuthApi } from './api';
import { HrSettingsProvider } from './context/HrSettingsContext';
import { clearConfidentialAccess } from './context/ConfidentialAccessContext';
import { HrAppShell } from './components/HrAppShell';
import './styles/hr-dashboard.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard /> },
  { id: 'employees', label: 'Employees', icon: <Icons.Employees /> },
  { id: 'salaries', label: 'Salaries', icon: <Icons.Dollar /> },
  { id: 'attendance', label: 'Attendance', icon: <Icons.Attendance /> },
  { id: 'leave', label: 'Leave', icon: <Icons.Leave /> },
  { id: 'departments', label: 'Departments', icon: <Icons.Departments /> },
  { id: 'reports', label: 'Reports', icon: <Icons.Reports /> },
  { id: 'messages', label: 'Messages', icon: <Icons.Mail /> },
  { id: 'settings', label: 'Settings', icon: <Icons.Settings /> },
];

const pageTitles: Record<string, string> = {
  dashboard: 'HR Overview',
  employees: 'Employees',
  salaries: 'Salaries',
  attendance: 'Attendance',
  leave: 'Leave Management',
  departments: 'Departments',
  reports: 'Reports',
  messages: 'Messages',
  settings: 'Settings',
};

const pages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  employees: Employees,
  salaries: Salaries,
  attendance: Attendance,
  leave: Leave,
  departments: Departments,
  reports: Reports,
  messages: Messages,
  settings: Settings,
};

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'reset' | 'signup'>('login');
  const [initialSetupPending, setInitialSetupPending] = useState(true);
  const [signUpVerificationEnabled, setSignUpVerificationEnabled] = useState(true);
  const api = getHrApi();
  const authApi = getAuthApi();

  useEffect(() => {
    api.getCurrentUser().then((u) => {
      setUser(u);
      api.isInitialSetupPending().then(setInitialSetupPending);
      authApi.isSignUpVerificationEnabled().then(setSignUpVerificationEnabled).catch(() => setSignUpVerificationEnabled(false));
      setChecking(false);
    });
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const loggedIn = await api.login(email, password, 'hr');
    if (loggedIn) {
      setUser(loggedIn);
      setInitialSetupPending(false);
    }
    return !!loggedIn;
  };

  const handleLogout = async () => {
    if (user) clearConfidentialAccess(user.id);
    await api.logout();
    setUser(null);
    setAuthScreen('login');
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', background: '#001B3A' }}>
        <LoadingSpinner message="Starting STRATERA HR..." />
      </div>
    );
  }

  if (!user) {
    if (authScreen === 'reset') {
      return (
        <ResetPasswordScreen
          appTitle="STRATERA HR"
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
          appTitle="STRATERA HR"
          appSubtitle="R&D SOFTWARE GROUP"
          verificationEnabled={signUpVerificationEnabled}
          onSignUpStart={(input) => authApi.signUpStart(input)}
          onSignUpComplete={(email, code) => authApi.signUpComplete(email, code)}
          onBack={() => setAuthScreen('login')}
          onSuccess={() => setAuthScreen('login')}
        />
      );
    }

    return (
      <LoginScreen
        appTitle="STRATERA HR"
        appSubtitle="R&D SOFTWARE GROUP"
        initialSetupPending={initialSetupPending}
        onLogin={handleLogin}
        onForgotPassword={() => setAuthScreen('reset')}
        onSignUp={() => setAuthScreen('signup')}
      />
    );
  }

  return (
    <HrSettingsProvider>
      <Layout
        appName={pageTitles[activeNav]}
        appSubtitle="HUMAN RESOURCES"
        navItems={navItems}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        userName={user.name}
        onLogout={handleLogout}
      >
        <HrAppShell user={user} activeNav={activeNav} onNavChange={setActiveNav} pages={pages} />
      </Layout>
    </HrSettingsProvider>
  );
}
