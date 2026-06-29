import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { strateraTheme } from '../theme';
import { Button } from './Button';
import { StrateraBrand } from './StrateraBrand';
import { validateWorkEmail } from '../utils/validation';
import type { SmtpConfig } from '../api/types';
import './credential-setup-hero.css';

interface CredentialSetupScreenProps {
  currentEmail: string;
  onSendVerification: (email: string, smtp: SmtpConfig) => Promise<{ ok: boolean; error?: string }>;
  onVerifyCode: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  onComplete: (email: string, newPassword: string) => Promise<boolean>;
}

const DEFAULT_ADMIN_PASSWORD = 'admin123';

const SETUP_STEPS = [
  { n: '1', title: 'Enter your work email', detail: 'Use a real address you can access.' },
  { n: '2', title: 'Verify from your inbox', detail: 'We email a 6-digit code via SMTP.' },
  { n: '3', title: 'Set your password', detail: 'Replace the default admin credentials.' },
];

const HERO_SLIDES = [
  {
    accent: '#0a1f38',
    tag: 'Finance',
    title: 'Accounting & reporting',
    caption: 'Transactions, invoicing, and financial visibility.',
    image: '/welcome/finance.svg',
  },
  {
    accent: '#10B981',
    tag: 'People',
    title: 'Human resources',
    caption: 'Payroll, attendance, leave, and employee records.',
    image: '/welcome/people.svg',
  },
  {
    accent: '#0f2847',
    tag: 'Platform',
    title: 'One secure workspace',
    caption: 'Finance and HR teams on one platform.',
    image: '/welcome/platform.svg',
  },
];

const GMAIL_APP_PASSWORD_STEPS = [
  'Open Google Account → Security (google.com/account/security).',
  'Turn on 2-Step Verification if it is not already enabled (follow Google’s prompts).',
  'Return to Security and open App passwords (you may need to search “App passwords”).',
  'Choose app: Mail · device: Other — name it STRATERA.',
  'Click Generate. Google shows a 16-character password.',
  'Copy that code and paste it in the SMTP password field below (spaces are fine).',
  'Keep host smtp.gmail.com and port 587 for Gmail.',
];

const fieldErrorStyle: CSSProperties = {
  fontSize: 12,
  color: strateraTheme.colors.danger,
  marginTop: 4,
  marginBottom: 0,
  lineHeight: 1.4,
};

function suggestSmtpForEmail(email: string): Partial<SmtpConfig> {
  const trimmed = email.trim().toLowerCase();
  const domain = trimmed.split('@')[1];
  if (!domain) return {};
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { host: 'smtp.gmail.com', port: '587', user: trimmed, from: trimmed };
  }
  if (['outlook.com', 'hotmail.com', 'live.com'].includes(domain)) {
    return { host: 'smtp-mail.outlook.com', port: '587', user: trimmed, from: trimmed };
  }
  return { user: trimmed, from: trimmed };
}

function isGmailAddress(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return domain === 'gmail.com' || domain === 'googlemail.com';
}

export function CredentialSetupScreen({
  currentEmail,
  onSendVerification,
  onVerifyCode,
  onComplete,
}: CredentialSetupScreenProps) {
  const [email, setEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [formError, setFormError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [codeSentMessage, setCodeSentMessage] = useState('');
  const [showGmailGuide, setShowGmailGuide] = useState(true);
  const [heroSlide, setHeroSlide] = useState(0);

  const normalizedEmail = email.trim().toLowerCase();
  const showGmailHelp = isGmailAddress(email) || smtpHost.includes('gmail');
  const currentHero = HERO_SLIDES[heroSlide];

  useEffect(() => {
    const timer = setInterval(() => setHeroSlide((s) => (s + 1) % HERO_SLIDES.length), 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('stratera-credential-verified-email');
      if (saved && saved === email.trim().toLowerCase()) {
        setEmailVerified(true);
        setCodeSent(true);
      }
    } catch {
      /* ignore */
    }
  }, [email]);

  const applySmtpHints = (value: string) => {
    const hint = suggestSmtpForEmail(value);
    if (hint.host) setSmtpHost(hint.host);
    if (hint.port) setSmtpPort(hint.port);
    if (hint.user) setSmtpUser(hint.user);
    if (hint.from) setSmtpFrom(hint.from);
  };

  const resetVerification = () => {
    setEmailVerified(false);
    setCodeSent(false);
    setVerifyCode('');
    setCodeError('');
    setCodeSentMessage('');
  };

  const handleEmailFocus = () => {
    if (email === currentEmail) setEmail('');
    resetVerification();
    setEmailError('');
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    resetVerification();
    setEmailError('');
    applySmtpHints(value);
  };

  const handleSendCode = async () => {
    setEmailError('');
    setCodeError('');
    setFormError('');
    setCodeSentMessage('');

    const formatError = validateWorkEmail(email);
    if (formatError) {
      setEmailError(
        formatError.includes('invalid') || formatError.includes('full work')
          ? 'This email address is invalid.'
          : formatError,
      );
      return;
    }

    if (!smtpHost.trim() || !smtpUser.trim() || !smtpPassword.trim() || !smtpFrom.trim()) {
      setEmailError('Complete all mail server fields so STRATERA can send the verification code.');
      return;
    }

    const smtp: SmtpConfig = {
      host: smtpHost.trim(),
      port: smtpPort.trim() || '587',
      user: smtpUser.trim(),
      password: smtpPassword.replace(/\s/g, ''),
      from: smtpFrom.trim(),
    };

    setSendingCode(true);
    try {
      const result = await onSendVerification(normalizedEmail, smtp);
      if (result.ok) {
        setCodeSent(true);
        setEmailVerified(false);
        setCodeSentMessage(
          `Verification code sent to ${normalizedEmail}. Check your inbox and spam folder, then enter the code below.`,
        );
      } else {
        setEmailError(result.error ?? 'Could not send verification email.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? '');
      setEmailError(message || 'Could not send verification email.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setCodeError('');
    setFormError('');
    if (!codeSent) {
      setCodeError('Please verify your email address before continuing.');
      return;
    }
    if (!/^\d{6}$/.test(verifyCode.trim())) {
      setCodeError('Enter the 6-digit code from your email inbox.');
      return;
    }
    setVerifyingCode(true);
    try {
      const result = await onVerifyCode(normalizedEmail, verifyCode.trim());
      if (result.ok) {
        setEmailVerified(true);
        setCodeError('');
        try {
          sessionStorage.setItem('stratera-credential-verified-email', normalizedEmail);
        } catch {
          /* ignore */
        }
      } else {
        setEmailVerified(false);
        setCodeError(result.error ?? 'Invalid verification code.');
      }
    } catch {
      setCodeError('Unable to verify code. Try again.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setEmailError('');
    setCodeError('');

    const formatError = validateWorkEmail(email);
    if (formatError) {
      setEmailError('This email address is invalid.');
      return;
    }
    if (!emailVerified) {
      setCodeError('Please verify your email address before continuing.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password === DEFAULT_ADMIN_PASSWORD) {
      setFormError('Choose a new password — the default password cannot be used.');
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const ok = await onComplete(normalizedEmail, password);
      if (ok) {
        try {
          sessionStorage.removeItem('stratera-credential-verified-email');
        } catch {
          /* ignore */
        }
      } else {
        setFormError('Could not save credentials. Try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save credentials.';
      if (message.toLowerCase().includes('verify')) {
        setCodeError(message);
        setEmailVerified(false);
      } else if (message.toLowerCase().includes('domain') || message.toLowerCase().includes('invalid')) {
        setEmailError(message);
      } else {
        setFormError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const activeStep = emailVerified ? 3 : codeSent ? 2 : email.trim() ? 1 : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: strateraTheme.colors.navy }}>
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 48,
          overflow: 'hidden',
          background: `linear-gradient(145deg, ${strateraTheme.colors.navyDark} 0%, ${strateraTheme.colors.navy} 45%, #0d3a6b 100%)`,
        }}
      >
        <div className="credential-setup-hero-grid" />
        <div
          className="credential-setup-glow credential-setup-glow-a"
          style={{ background: currentHero.accent }}
        />
        <div
          className="credential-setup-glow credential-setup-glow-b"
          style={{ background: currentHero.accent }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 440,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <StrateraBrand size="lg" layout="vertical" />

          <h2
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: strateraTheme.colors.white,
              marginTop: 28,
              lineHeight: 1.3,
            }}
          >
            Set up your administrator account
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.72)',
              marginTop: 10,
              lineHeight: 1.65,
              maxWidth: 360,
            }}
          >
            Secure your STRATERA workspace with a verified email and a personal password.
          </p>

          <div className="credential-setup-visual">
            <div className="credential-setup-visual-stage">
              <div className="credential-setup-carousel">
                {HERO_SLIDES.map((slide, i) => (
                  <div
                    key={slide.tag}
                    className={`credential-setup-slide${i === heroSlide ? ' active' : ''}`}
                  >
                    <img
                      key={`hero-${slide.tag}-${heroSlide === i ? 'on' : 'off'}`}
                      src={slide.image}
                      alt=""
                      className="credential-setup-slide-img"
                    />
                    <div className="credential-setup-slide-shade" />
                  </div>
                ))}
              </div>
              <div className="credential-setup-shine" aria-hidden="true" />
              <div className="credential-setup-orbs" aria-hidden="true">
                <span className="credential-setup-orb credential-setup-orb-1" style={{ background: currentHero.accent }} />
                <span className="credential-setup-orb credential-setup-orb-2" style={{ background: currentHero.accent }} />
                <span className="credential-setup-orb credential-setup-orb-3" style={{ background: currentHero.accent }} />
              </div>
            </div>
            <div className="credential-setup-visual-card" key={`hero-card-${heroSlide}`}>
              <span
                className="credential-setup-visual-badge"
                style={{ color: currentHero.accent, borderColor: `${currentHero.accent}44` }}
              >
                {currentHero.tag}
              </span>
              <p className="credential-setup-visual-title">{currentHero.title}</p>
              <p className="credential-setup-visual-caption">{currentHero.caption}</p>
              <div className="credential-setup-dots">
                {HERO_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Slide ${i + 1}`}
                    className={`credential-setup-dot${i === heroSlide ? ' active' : ''}`}
                    onClick={() => setHeroSlide(i)}
                    style={i === heroSlide ? { background: currentHero.accent } : undefined}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 28, width: '100%', maxWidth: 360, display: 'grid', gap: 10 }}>
            {SETUP_STEPS.map((step, i) => {
              const stepNum = i + 1;
              const isActive = activeStep === stepNum;
              const isDone = activeStep > stepNum;
              return (
                <div
                  key={step.n}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: isActive ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${isActive ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.1)'}`,
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: isDone || isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                      background: isDone
                        ? strateraTheme.colors.success
                        : isActive
                          ? strateraTheme.colors.accent
                          : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {isDone ? '✓' : step.n}
                  </span>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: isActive || isDone ? '#fff' : 'rgba(255,255,255,0.85)',
                      }}
                    >
                      {step.title}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>
                      {step.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          background: strateraTheme.colors.white,
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: strateraTheme.colors.navy, marginBottom: 8 }}>
            Account setup
          </h1>
          <p style={{ fontSize: 13, color: strateraTheme.colors.gray500, marginBottom: 24, lineHeight: 1.5 }}>
            STRATERA sends a 6-digit verification code to your email via SMTP.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
            <div>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>Work email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onFocus={handleEmailFocus}
                  required
                  placeholder="name@company.com"
                  style={{
                    ...inputStyle,
                    borderColor: emailError ? strateraTheme.colors.danger : strateraTheme.colors.gray200,
                  }}
                  autoComplete="email"
                  disabled={emailVerified}
                />
              </label>
              {emailError && <p style={fieldErrorStyle}>{emailError}</p>}
              {emailVerified && (
                <p style={{ fontSize: 12, color: strateraTheme.colors.success, marginTop: 4 }}>Email verified</p>
              )}
            </div>

            {!emailVerified && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: `1px solid ${strateraTheme.colors.gray200}`,
                  background: strateraTheme.colors.gray50,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: strateraTheme.colors.gray700, margin: 0 }}>
                  Mail server (required to send verification code)
                </p>

                {showGmailHelp && (
                  <div
                    style={{
                      borderRadius: 8,
                      border: `1px solid #BFDBFE`,
                      background: '#EFF6FF',
                      padding: '10px 12px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowGmailGuide((v) => !v)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        color: strateraTheme.colors.navy,
                        textAlign: 'left',
                      }}
                    >
                      How to get a Gmail App Password
                      <span style={{ fontSize: 11, color: strateraTheme.colors.gray500 }}>
                        {showGmailGuide ? 'Hide' : 'Show'}
                      </span>
                    </button>
                    {showGmailGuide && (
                      <ol
                        style={{
                          margin: '10px 0 0',
                          paddingLeft: 18,
                          fontSize: 11,
                          color: strateraTheme.colors.gray600,
                          lineHeight: 1.55,
                        }}
                      >
                        {GMAIL_APP_PASSWORD_STEPS.map((line) => (
                          <li key={line} style={{ marginBottom: 6 }}>{line}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="SMTP host"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="Port"
                    style={inputStyle}
                  />
                </div>
                <input
                  type="email"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="SMTP username (your email)"
                  style={inputStyle}
                  autoComplete="username"
                />
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="Gmail App Password (16 characters)"
                  style={inputStyle}
                  autoComplete="new-password"
                />
                <input
                  type="email"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="From email address"
                  style={inputStyle}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={sendingCode || !email.trim()}
                  onClick={handleSendCode}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {sendingCode ? 'Sending code...' : codeSent ? 'Resend verification code' : 'Send verification code'}
                </Button>
              </div>
            )}

            {codeSentMessage && !emailVerified && (
              <p style={{ fontSize: 12, color: strateraTheme.colors.success, lineHeight: 1.5, margin: 0 }}>
                {codeSentMessage}
              </p>
            )}

            {codeSent && !emailVerified && (
              <div>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>
                    Verification code from your email
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code from inbox"
                    style={{
                      ...inputStyle,
                      borderColor: codeError ? strateraTheme.colors.danger : strateraTheme.colors.gray200,
                    }}
                  />
                </label>
                {codeError && <p style={fieldErrorStyle}>{codeError}</p>}
                <Button
                  type="button"
                  size="sm"
                  disabled={verifyingCode || verifyCode.length < 6}
                  onClick={handleVerifyCode}
                  style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                >
                  {verifyingCode ? 'Verifying...' : 'Verify email'}
                </Button>
              </div>
            )}

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>New password</span>
              {!emailVerified && (
                <span style={{ fontSize: 12, color: strateraTheme.colors.gray500 }}>
                  Available after you verify your email above.
                </span>
              )}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                style={{
                  ...inputStyle,
                  cursor: emailVerified ? 'text' : 'not-allowed',
                  opacity: emailVerified ? 1 : 0.7,
                }}
                disabled={!emailVerified}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>
                Confirm password
              </span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat new password"
                style={{
                  ...inputStyle,
                  cursor: emailVerified ? 'text' : 'not-allowed',
                  opacity: emailVerified ? 1 : 0.7,
                }}
                disabled={!emailVerified}
              />
            </label>
            {formError && <p style={{ ...fieldErrorStyle, textAlign: 'center' }}>{formError}</p>}
            <Button type="submit" disabled={loading || !emailVerified} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Saving...' : 'Save and continue'}
            </Button>
          </form>
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
  background: strateraTheme.colors.white,
};
