import { useState, type CSSProperties, type FormEvent } from 'react';
import { strateraTheme } from '../theme';
import { Button } from './Button';
import { BackLink } from './BackLink';
import { StrateraBrand } from './StrateraBrand';
import { validateEmail } from '../utils/validation';

interface SignUpScreenProps {
  appTitle?: string;
  appSubtitle?: string;
  variant?: 'default' | 'portal';
  moduleLabel?: string;
  verificationEnabled?: boolean;
  onSignUpStart: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: true; needsVerification: boolean } | { ok: false; error: string }>;
  onSignUpComplete: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  onBack: () => void;
  onSuccess: () => void;
}

export function SignUpScreen({
  appTitle = 'STRATERA',
  appSubtitle = 'Create your account',
  variant = 'default',
  moduleLabel,
  verificationEnabled = true,
  onSignUpStart,
  onSignUpComplete,
  onBack,
  onSuccess,
}: SignUpScreenProps) {
  const [step, setStep] = useState<'details' | 'verify' | 'done'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const isPortal = variant === 'portal';

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Enter your full name.');
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
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
      const result = await onSignUpStart({
        name: trimmedName,
        email: normalizedEmail,
        password,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.needsVerification) {
        setStep('verify');
      } else {
        setStep('done');
      }
    } catch {
      setError('Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const result = await onSignUpComplete(normalizedEmail, code.trim());
      if (!result.ok) {
        setError(result.error ?? 'Verification failed.');
        return;
      }
      setStep('done');
    } catch {
      setError('Could not verify your email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formCard = (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={labelStyle}>Create account</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: strateraTheme.colors.navy, marginTop: 6 }}>
          {step === 'verify' ? 'Verify your email' : step === 'done' ? 'Account created' : 'Sign up'}
        </h1>
        <p style={{ fontSize: 13, color: strateraTheme.colors.gray500, marginTop: 6, lineHeight: 1.5 }}>
          {step === 'verify'
            ? `We sent a 6-digit code to ${normalizedEmail}. Enter it below to finish.`
            : step === 'done'
              ? 'Your account is ready. Sign in with the email and password you just created.'
              : moduleLabel
                ? `Create a STRATERA account for ${moduleLabel}. Use a real Gmail address you can access.`
                : 'Use your name, a valid Gmail address, and a password you will remember.'}
        </p>
      </div>

      {step === 'details' && (
        <form onSubmit={handleDetailsSubmit} style={{ display: 'grid', gap: 16 }}>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </label>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Email (Gmail recommended)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="you@gmail.com"
              autoComplete="email"
            />
          </label>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </label>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              style={inputStyle}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </label>
          {verificationEnabled && (
            <p className="small text-muted mb-0">
              We will email a verification code before your account is activated.
            </p>
          )}
          {error && <p style={errorStyle}>{error}</p>}
          <Button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerifySubmit} style={{ display: 'grid', gap: 16 }}>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Verification code</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              style={{ ...inputStyle, letterSpacing: '0.35em', textAlign: 'center', fontSize: 18 }}
              placeholder="000000"
              autoComplete="one-time-code"
            />
          </label>
          {error && <p style={errorStyle}>{error}</p>}
          <Button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Verifying…' : 'Verify and finish'}
          </Button>
          <button
            type="button"
            onClick={() => { setStep('details'); setCode(''); setError(''); }}
            style={linkButtonStyle}
          >
            Back to details
          </button>
        </form>
      )}

      {step === 'done' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: '#ecfdf5',
              color: '#065f46',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Account created for <strong>{normalizedEmail}</strong>. You can now sign in.
          </div>
          <Button onClick={onSuccess} style={{ width: '100%', justifyContent: 'center' }}>
            Go to sign in
          </Button>
        </div>
      )}

      {step !== 'done' && (
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <button type="button" onClick={onBack} style={linkButtonStyle}>
            Already have an account? Sign in
          </button>
        </div>
      )}
    </div>
  );

  if (isPortal) {
    return (
      <div className="portal-root portal-auth">
        <div className="portal-auth-brand">
          <div className="portal-grid-bg" />
          <BackLink text="Back to sign in" variant="ghost" onClick={onBack} className="portal-auth-back" />
          <div className="portal-auth-brand-content">
            <StrateraBrand size="lg" layout="vertical" />
            <h2 className="portal-auth-heading">{appTitle}</h2>
            <p className="portal-auth-lead">{appSubtitle}</p>
          </div>
        </div>
        <div className="portal-auth-form-wrap">
          <div className="portal-form-card portal-form-card-elevated">{formCard}</div>
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
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <StrateraBrand size="lg" layout="vertical" />
          <h2 style={{ fontSize: 28, fontWeight: 600, color: strateraTheme.colors.white, marginTop: 40 }}>
            Join STRATERA
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 12, lineHeight: 1.6 }}>
            Create your own account in minutes. No SMTP setup — just your Gmail and a password.
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
        {formCard}
      </div>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: strateraTheme.colors.gray400,
  marginBottom: 8,
};

const fieldStyle: CSSProperties = { display: 'grid', gap: 6 };
const fieldLabelStyle: CSSProperties = { fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 };
const inputStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${strateraTheme.colors.gray200}`,
  fontSize: 14,
  color: strateraTheme.colors.gray700,
  background: strateraTheme.colors.gray50,
};
const errorStyle: CSSProperties = { fontSize: 13, color: strateraTheme.colors.danger, textAlign: 'center' };
const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: strateraTheme.colors.navy,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'underline',
};
