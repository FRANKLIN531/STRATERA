import { useState, type CSSProperties, type FormEvent } from 'react';
import { strateraTheme } from '../theme';
import { Button } from './Button';
import { StrateraBrand } from './StrateraBrand';
import { validateEmail } from '../utils/validation';

interface LoginScreenProps {
  appTitle: string;
  appSubtitle: string;
  initialSetupPending?: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onForgotPassword?: () => void;
}

const BOOTSTRAP_HINT =
  'Use admin@stratera.com and admin123 to sign in and complete account setup.';

export function LoginScreen({
  appTitle,
  appSubtitle,
  initialSetupPending = false,
  onLogin,
  onForgotPassword,
}: LoginScreenProps) {
  const [email, setEmail] = useState(() => (initialSetupPending ? 'admin@stratera.com' : ''));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      if (!success) setError('Invalid email or password, or insufficient access for this application.');
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: strateraTheme.colors.navy }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 48,
          background: `linear-gradient(160deg, ${strateraTheme.colors.navyDark} 0%, ${strateraTheme.colors.navy} 55%, ${strateraTheme.colors.navyLight} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(59,130,246,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(16,185,129,0.08) 0%, transparent 45%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <StrateraBrand size="lg" layout="vertical" />
          <h2
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: strateraTheme.colors.white,
              marginTop: 40,
              lineHeight: 1.25,
            }}
          >
            {appTitle}
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 12, lineHeight: 1.6 }}>
            Secure access to your STRATERA workspace. Sign in to continue to {appSubtitle.toLowerCase()}.
          </p>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          background: strateraTheme.colors.white,
        }}
      >
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 32 }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: strateraTheme.colors.gray400,
                marginBottom: 8,
              }}
            >
              Sign in
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: strateraTheme.colors.navy }}>{appTitle}</h1>
            <p style={{ fontSize: 13, color: strateraTheme.colors.gray500, marginTop: 6 }}>{appSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </label>

            {error && (
              <p style={{ fontSize: 13, color: strateraTheme.colors.danger, textAlign: 'center' }}>{error}</p>
            )}

            <Button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {!initialSetupPending && onForgotPassword && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                type="button"
                onClick={onForgotPassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: strateraTheme.colors.navy,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {initialSetupPending && (
            <p
              style={{
                fontSize: 12,
                color: strateraTheme.colors.gray400,
                textAlign: 'center',
                marginTop: 28,
                lineHeight: 1.5,
              }}
            >
              {BOOTSTRAP_HINT}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${strateraTheme.colors.gray200}`,
  fontSize: 14,
  color: strateraTheme.colors.gray700,
  background: strateraTheme.colors.gray50,
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
