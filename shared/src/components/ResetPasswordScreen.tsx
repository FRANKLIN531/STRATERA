import { useState, type CSSProperties, type FormEvent } from 'react';
import { strateraTheme } from '../theme';
import { Button } from './Button';
import { BackLink } from './BackLink';
import { StrateraBrand } from './StrateraBrand';
import { validateEmail } from '../utils/validation';

interface ResetPasswordScreenProps {
  appTitle?: string;
  variant?: 'default' | 'portal';
  onSendResetCode: (email: string) => Promise<{ ok: boolean; error?: string }>;
  onCompleteReset: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  onBack: () => void;
}

export function ResetPasswordScreen({
  appTitle = 'STRATERA',
  variant = 'default',
  onSendResetCode,
  onCompleteReset,
  onBack,
}: ResetPasswordScreenProps) {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setLoading(true);
    try {
      const result = await onSendResetCode(normalizedEmail);
      if (result.ok) {
        setStep('reset');
      } else {
        setError(result.error ?? 'Could not send reset code.');
      }
    } catch {
      setError('Unable to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit reset code from your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await onCompleteReset(normalizedEmail, code.trim(), password);
      if (result.ok) setSuccess(true);
      else setError(result.error ?? 'Could not reset password.');
    } catch {
      setError('Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'portal') {
    return (
      <div className="portal-root portal-auth">
        <div className="portal-auth-brand">
          <div className="portal-grid-bg" />
          <div className="portal-glow portal-glow-a" />
          <div className="portal-auth-brand-content">
            <StrateraBrand size="lg" layout="vertical" />
            <h2 className="portal-auth-heading" style={{ marginTop: 32 }}>Account security</h2>
            <p className="portal-auth-lead">
              We send a 6-digit code to your registered email to reset your password.
            </p>
          </div>
        </div>

        <div className="portal-auth-form-wrap">
          <div style={{ width: '100%', maxWidth: 420 }}>
            <BackLink label="sign in" variant="muted" onClick={onBack} className="mb-3" />

            <div className="portal-form-card portal-form-card-elevated">
              {renderFormContent('portal')}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        }}
      >
        <StrateraBrand size="lg" layout="vertical" />
        <h2 style={{ fontSize: 24, fontWeight: 600, color: strateraTheme.colors.white, marginTop: 32 }}>
          Reset your password
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 12, lineHeight: 1.6 }}>
          We send a 6-digit code to your registered email to reset your password.
        </p>
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
          <BackLink label="sign in" variant="muted" onClick={onBack} className="mb-4" />

          <h1 style={{ fontSize: 22, fontWeight: 700, color: strateraTheme.colors.navy, marginBottom: 8 }}>
            {appTitle}
          </h1>

          {renderFormContent('default')}
        </div>
      </div>
    </div>
  );

  function renderFormContent(mode: 'default' | 'portal') {
    const isPortal = mode === 'portal';

    if (success) {
      return (
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: 14,
              color: strateraTheme.colors.success,
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Your password has been updated. Sign in with your new password.
          </p>
          <Button onClick={onBack} style={{ width: '100%', justifyContent: 'center' }}>
            Return to sign in
          </Button>
        </div>
      );
    }

    if (step === 'email') {
      return (
        <>
          <div style={{ marginBottom: isPortal ? 28 : 24, textAlign: isPortal ? 'center' : 'left' }}>
            {isPortal && (
              <h1 style={{ fontSize: 22, fontWeight: 700, color: strateraTheme.colors.navy }}>Reset password</h1>
            )}
            <p
              style={{
                fontSize: 13,
                color: strateraTheme.colors.gray500,
                marginTop: isPortal ? 8 : 0,
                lineHeight: 1.5,
              }}
            >
              Enter your registered email. We will send a 6-digit reset code to your inbox.
            </p>
          </div>
          <form onSubmit={handleSendCode} style={{ display: 'grid', gap: 18 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span
                className={isPortal ? 'portal-field-label' : undefined}
                style={
                  isPortal
                    ? undefined
                    : { fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }
                }
              >
                Email address
              </span>
              <input
                type="email"
                className={isPortal ? 'portal-input' : undefined}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={isPortal ? undefined : inputStyle}
                autoComplete="email"
              />
            </label>
            {error && (
              <p className={isPortal ? 'portal-form-error' : undefined} style={isPortal ? undefined : errorStyle}>
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: isPortal ? 4 : 0 }}
            >
              {loading ? 'Sending...' : 'Send reset code'}
            </Button>
          </form>
        </>
      );
    }

    return (
      <>
        <div style={{ marginBottom: isPortal ? 28 : 24, textAlign: isPortal ? 'center' : 'left' }}>
          {isPortal && (
            <h1 style={{ fontSize: 22, fontWeight: 700, color: strateraTheme.colors.navy }}>Set new password</h1>
          )}
          <p
            style={{
              fontSize: 13,
              color: strateraTheme.colors.gray500,
              marginTop: isPortal ? 8 : 0,
              lineHeight: 1.5,
            }}
          >
            Check your email for the 6-digit code sent to <strong>{normalizedEmail}</strong>, then choose a new
            password.
          </p>
        </div>
        <form onSubmit={handleReset} style={{ display: 'grid', gap: 18 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span
              className={isPortal ? 'portal-field-label' : undefined}
              style={
                isPortal ? undefined : { fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }
              }
            >
              Reset code
            </span>
            <input
              type="text"
              className={isPortal ? 'portal-input' : undefined}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="6-digit code"
              style={isPortal ? undefined : inputStyle}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span
              className={isPortal ? 'portal-field-label' : undefined}
              style={
                isPortal ? undefined : { fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }
              }
            >
              New password
            </span>
            <input
              type="password"
              className={isPortal ? 'portal-input' : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              style={isPortal ? undefined : inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span
              className={isPortal ? 'portal-field-label' : undefined}
              style={
                isPortal ? undefined : { fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }
              }
            >
              Confirm password
            </span>
            <input
              type="password"
              className={isPortal ? 'portal-input' : undefined}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat new password"
              style={isPortal ? undefined : inputStyle}
            />
          </label>
          {error && (
            <p className={isPortal ? 'portal-form-error' : undefined} style={isPortal ? undefined : errorStyle}>
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: isPortal ? 4 : 0 }}
          >
            {loading ? 'Updating...' : 'Update password'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setPassword('');
              setConfirm('');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: strateraTheme.colors.gray500,
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Use a different email
          </button>
        </form>
      </>
    );
  }
}

const inputStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${strateraTheme.colors.gray200}`,
  fontSize: 14,
  color: strateraTheme.colors.gray700,
  background: strateraTheme.colors.gray50,
};

const errorStyle: CSSProperties = {
  fontSize: 13,
  color: strateraTheme.colors.danger,
  textAlign: 'center',
};
