import { useState, type FormEvent } from 'react';
import { Button, StrateraBrand, strateraTheme, validateEmail, BackLink } from '@stratera/shared';
import type { DesktopModule } from '../types';
import { MODULE_LABELS } from '../types';

interface ModuleLoginScreenProps {
  module: DesktopModule;
  initialSetupPending: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onResetPassword: () => void;
  onBack: () => void;
}

const BOOTSTRAP_HINT =
  'Use admin@stratera.com and admin123 to sign in and complete account setup.';

export function ModuleLoginScreen({
  module,
  initialSetupPending,
  onLogin,
  onResetPassword,
  onBack,
}: ModuleLoginScreenProps) {
  const [email, setEmail] = useState(() => (initialSetupPending ? 'admin@stratera.com' : ''));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const labels = MODULE_LABELS[module];
  const accent = module === 'accounting' ? '#0a1f38' : '#10B981';

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
            Sign in to access {labels.subtitle}. Your credentials are shared across all STRATERA desktops.
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

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span className="portal-field-label">Email address</span>
              <input
                type="email"
                className="portal-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@stratera.com"
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span className="portal-field-label">Password</span>
              <input
                type="password"
                className="portal-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </label>

            {error && <p className="portal-form-error">{error}</p>}

            <Button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Signing in...' : 'Sign in to desktop'}
            </Button>
          </form>

          {initialSetupPending ? (
            <p className="portal-demo-hint">{BOOTSTRAP_HINT}</p>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 22 }}>
              <button type="button" className="portal-link" onClick={onResetPassword}>
                Forgot password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
