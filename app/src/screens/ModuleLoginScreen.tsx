import { useEffect, useState, type FormEvent } from 'react';
import { Button, StrateraBrand, strateraTheme, validateEmail, BackLink } from '@stratera/shared';
import type { DesktopModule } from '../types';
import { MODULE_LABELS } from '../types';

interface ModuleLoginScreenProps {
  module: DesktopModule;
  initialSetupPending: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onResetPassword: () => void;
  onSignUp: () => void;
  onBack: () => void;
}

export function ModuleLoginScreen({
  module,
  initialSetupPending,
  onLogin,
  onResetPassword,
  onSignUp,
  onBack,
}: ModuleLoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [allowAutofill, setAllowAutofill] = useState(false);
  const labels = MODULE_LABELS[module];
  const accent = module === 'accounting' ? '#0a1f38' : '#10B981';

  // Keep fields blank: browser password managers often inject old demo credentials.
  useEffect(() => {
    setEmail('');
    setPassword('');
    const clear = window.setTimeout(() => {
      setEmail('');
      setPassword('');
    }, 150);
    return () => window.clearTimeout(clear);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setLoading(true);
    try {
      const success = await onLogin(email.trim().toLowerCase(), password);
      if (!success) {
        setError('Invalid email or password, or you do not have access to this desktop.');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-root portal-auth">
      <div className="portal-auth-brand">
        <div className="portal-grid-bg" />
        <div className="portal-glow portal-glow-a" style={{ background: accent }} />
        <BackLink text="Change desktop" variant="ghost" onClick={onBack} className="portal-auth-back" />
        <div className="portal-auth-brand-content">
          <StrateraBrand size="lg" layout="vertical" />
          <p className="portal-step-label portal-auth-step">Step 2 of 2</p>
          <h2 className="portal-auth-heading">{labels.title}</h2>
          <p className="portal-auth-lead">
            Sign in to access {labels.subtitle}. Your credentials work across all STRATERA desktops.
          </p>
        </div>
      </div>

      <div className="portal-auth-form-wrap">
        <div className="portal-form-card portal-form-card-elevated">
          <div style={{ marginBottom: 28 }}>
            <p className="portal-form-label">Sign in</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: strateraTheme.colors.navy, marginTop: 6 }}>
              {labels.title}
            </h1>
            <p style={{ fontSize: 13, color: strateraTheme.colors.gray500, marginTop: 6 }}>{labels.subtitle}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            style={{ display: 'grid', gap: 18 }}
          >
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="portal-field-label">Email address</span>
              <input
                type="email"
                className="portal-input"
                name="stratera-login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setAllowAutofill(true)}
                required
                placeholder="Email address"
                autoComplete="off"
                readOnly={!allowAutofill}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span className="portal-field-label">Password</span>
              <input
                type="password"
                className="portal-input"
                name="stratera-login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setAllowAutofill(true)}
                required
                placeholder="Password"
                autoComplete="new-password"
                readOnly={!allowAutofill}
              />
            </label>

            {error && <p className="portal-form-error">{error}</p>}

            <Button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Signing in...' : 'Sign in to desktop'}
            </Button>
          </form>

          {initialSetupPending ? (
            <p className="portal-auth-hint">New here? Create an account to get started.</p>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 22 }}>
              <button type="button" className="portal-link" onClick={onResetPassword}>
                Forgot password?
              </button>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button type="button" className="portal-link" onClick={onSignUp}>
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
