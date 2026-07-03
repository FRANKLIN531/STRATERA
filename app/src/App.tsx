import { useState, useEffect } from 'react';
import { LoadingSpinner, ResetPasswordScreen, SignUpScreen } from '@stratera/shared';
import type { User } from '@stratera/shared';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { DesktopSelectScreen } from './screens/DesktopSelectScreen';
import { ModuleLoginScreen } from './screens/ModuleLoginScreen';
import { AccountingDesktop } from './modules/AccountingDesktop';
import { HrDesktop } from './modules/HrDesktop';
import { getAuthApi } from './api';
import type { AppScreen, DesktopModule } from './types';
import { MODULE_LABELS } from './types';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [module, setModule] = useState<DesktopModule | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initialSetupPending, setInitialSetupPending] = useState(true);
  const [signUpVerificationEnabled, setSignUpVerificationEnabled] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = getAuthApi('accounting');
    auth.getCurrentUser().then((u) => {
      if (u) {
        setUser(u);
        const saved = sessionStorage.getItem('stratera-module') as DesktopModule | null;
        if (saved === 'accounting' || saved === 'hr') {
          setModule(saved);
        } else if (u.appAccess === 'hr') {
          setModule('hr');
        } else {
          setModule('accounting');
        }
        setScreen('desktop');
      }
      auth.isInitialSetupPending().then(setInitialSetupPending);
      auth.isSignUpVerificationEnabled().then(setSignUpVerificationEnabled).catch(() => setSignUpVerificationEnabled(false));
      setChecking(false);
    });
  }, []);

  const handleLogin = async (email: string, password: string) => {
    if (!module) return false;
    const auth = getAuthApi(module);
    const loggedIn = await auth.login(email, password, module);
    if (loggedIn) {
      setUser(loggedIn);
      sessionStorage.setItem('stratera-module', module);
      setScreen('desktop');
      setInitialSetupPending(false);
    }
    return !!loggedIn;
  };

  const handleResetSendCode = async (email: string) => {
    const auth = getAuthApi(module ?? 'accounting');
    return auth.sendPasswordResetCode(email);
  };

  const handleResetComplete = async (email: string, code: string, newPassword: string) => {
    const auth = getAuthApi(module ?? 'accounting');
    return auth.completePasswordResetWithCode(email, code, newPassword);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('stratera-module');
    setUser(null);
    setScreen('select');
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', background: '#0f172a' }}>
        <LoadingSpinner message="Starting STRATERA..." />
      </div>
    );
  }

  if (screen === 'welcome') {
    return <WelcomeScreen onContinue={() => setScreen('select')} />;
  }

  if (screen === 'select') {
    return (
      <DesktopSelectScreen
        onSelect={(m) => {
          setModule(m);
          setScreen('login');
        }}
        onBack={() => setScreen('welcome')}
      />
    );
  }

  if (screen === 'login' && module) {
    return (
      <ModuleLoginScreen
        module={module}
        initialSetupPending={initialSetupPending}
        onLogin={handleLogin}
        onResetPassword={() => setScreen('reset')}
        onSignUp={() => setScreen('signup')}
        onBack={() => setScreen('select')}
      />
    );
  }

  if (screen === 'signup' && module) {
    const auth = getAuthApi(module);
    const labels = MODULE_LABELS[module];
    return (
      <SignUpScreen
        variant="portal"
        appTitle={labels.title}
        appSubtitle="Create your STRATERA account"
        moduleLabel={labels.title}
        verificationEnabled={signUpVerificationEnabled}
        onSignUpStart={(input) =>
          auth.signUpStart({ ...input, appAccess: module === 'hr' ? 'hr' : 'accounting' })
        }
        onSignUpComplete={(email, code) => auth.signUpComplete(email, code)}
        onBack={() => setScreen('login')}
        onSuccess={() => setScreen('login')}
      />
    );
  }

  if (screen === 'reset') {
    return (
      <ResetPasswordScreen
        variant="portal"
        onSendResetCode={handleResetSendCode}
        onCompleteReset={handleResetComplete}
        onBack={() => setScreen(module ? 'login' : 'select')}
      />
    );
  }

  if (screen === 'desktop' && user && module) {
    if (module === 'accounting') {
      return <AccountingDesktop user={user} onLogout={handleLogout} />;
    }
    return <HrDesktop user={user} onLogout={handleLogout} />;
  }

  return <WelcomeScreen onContinue={() => setScreen('select')} />;
}
