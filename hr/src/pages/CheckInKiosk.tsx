import { useMemo, useState } from 'react';
import {
  Button, normalizeEmail, validatePhone, validateEmail,
} from '@stratera/shared';
import type { CheckInAction, CheckInLookupResult } from '@stratera/shared';
import { lookupCheckIn, confirmCheckIn } from '../api/kioskClient';

type Step = 'identify' | 'confirm' | 'done';

function parseSiteToken(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('site')?.trim() ?? '';
}

export function CheckInKiosk() {
  const siteToken = useMemo(() => parseSiteToken(), []);
  const [step, setStep] = useState<Step>('identify');
  const [useEmail, setUseEmail] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState<CheckInLookupResult | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  if (!siteToken) {
    return (
      <div className="check-in-kiosk">
        <div className="check-in-card">
          <h1>STRATERA Check-in</h1>
          <p className="text-danger">Open this page by scanning the QR code at your office entrance.</p>
        </div>
      </div>
    );
  }

  const handleLookup = async () => {
    setError('');
    if (useEmail) {
      const emailErr = validateEmail(email);
      if (emailErr) {
        setError(emailErr);
        return;
      }
    } else {
      const phoneErr = validatePhone(phone);
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
    }

    setLoading(true);
    try {
      const result = await lookupCheckIn({
        siteToken,
        phone: useEmail ? undefined : phone.trim(),
        email: useEmail ? normalizeEmail(email) : undefined,
      });
      if (!result.ok) {
        setError(result.error ?? 'Could not find your record.');
        return;
      }
      setLookup(result);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!lookup?.ok || !lookup.employee || !lookup.action) return;
    setLoading(true);
    setError('');
    try {
      const result = await confirmCheckIn({
        siteToken,
        employeeId: lookup.employee.id,
        action: lookup.action,
      });
      if (!result.ok) {
        setError(result.error ?? 'Could not record attendance.');
        return;
      }
      setSuccessMessage(result.message ?? 'Attendance recorded.');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record attendance.');
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = (action?: CheckInAction) =>
    action === 'check_out' ? 'Check out' : 'Check in';

  return (
    <div className="check-in-kiosk">
      <div className="check-in-card">
        <div className="check-in-brand">
          <div className="check-in-logo">S</div>
          <div>
            <h1>STRATERA</h1>
            <p>Employee check-in</p>
          </div>
        </div>

        {step === 'identify' && (
          <form
            className="check-in-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) void handleLookup();
            }}
          >
            <p className="check-in-lead">
              Enter the <strong>phone number</strong> or <strong>email</strong> HR has on your employee record.
            </p>
            <div className="check-in-toggle">
              <button
                type="button"
                className={!useEmail ? 'active' : ''}
                onClick={() => setUseEmail(false)}
              >
                Phone
              </button>
              <button
                type="button"
                className={useEmail ? 'active' : ''}
                onClick={() => setUseEmail(true)}
              >
                Email
              </button>
            </div>
            {useEmail ? (
              <input
                type="email"
                className="form-control form-control-lg"
                placeholder="work@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            ) : (
              <input
                type="tel"
                className="form-control form-control-lg"
                placeholder="020 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                autoFocus
              />
            )}
            {error && <p className="check-in-error">{error}</p>}
            <Button type="submit" className="check-in-primary-btn" disabled={loading}>
              {loading ? 'Looking up…' : 'Continue'}
            </Button>
          </form>
        )}

        {step === 'confirm' && lookup?.ok && lookup.employee && (
          <form
            className="check-in-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) void handleConfirm();
            }}
          >
            <div className="check-in-welcome">
              <p className="text-muted small mb-1">Confirm your details</p>
              <h2>{lookup.employee.name}</h2>
              <p className="text-secondary">{lookup.employee.department}</p>
              <p className="mt-3">{lookup.message}</p>
            </div>
            {error && <p className="check-in-error">{error}</p>}
            <div className="check-in-action-row">
              <Button
                type="button"
                variant="outline"
                className="check-in-secondary-btn"
                onClick={() => { setStep('identify'); setError(''); }}
              >
                Back
              </Button>
              <Button type="submit" className="check-in-primary-btn" disabled={loading}>
                {loading ? 'Saving…' : actionLabel(lookup.action)}
              </Button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <form
            className="check-in-form check-in-success"
            onSubmit={(e) => {
              e.preventDefault();
              setStep('identify');
              setLookup(null);
              setPhone('');
              setEmail('');
              setSuccessMessage('');
            }}
          >
            <div className="check-in-success-icon">✓</div>
            <p>{successMessage}</p>
            <Button type="submit" variant="outline" className="check-in-primary-btn">
              Done
            </Button>
          </form>
        )}
      </div>

      <style>{`
        .check-in-kiosk {
          min-height: 100vh;
          background: linear-gradient(160deg, #001b3a 0%, #0a3d7a 55%, #1565c0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
        }
        .check-in-card {
          background: #fff;
          border-radius: 16px;
          padding: 28px 24px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
        }
        .check-in-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }
        .check-in-brand h1 {
          font-size: 1.25rem;
          margin: 0;
          color: #001b3a;
        }
        .check-in-brand p {
          margin: 0;
          font-size: 0.85rem;
          color: #64748b;
        }
        .check-in-logo {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #001b3a;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.4rem;
        }
        .check-in-form {
          margin: 0;
        }
        .check-in-primary-btn {
          width: 100%;
          margin-top: 16px;
          justify-content: center;
          text-align: center;
        }
        .check-in-secondary-btn {
          flex: 1;
          justify-content: center;
        }
        .check-in-action-row {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .check-in-action-row .check-in-primary-btn {
          flex: 2;
          width: auto;
          margin-top: 0;
        }
        .check-in-lead {
          color: #475569;
          font-size: 0.95rem;
          margin-bottom: 16px;
        }
        .check-in-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .check-in-toggle button {
          flex: 1;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          border-radius: 8px;
          padding: 8px;
          font-size: 0.9rem;
        }
        .check-in-toggle button.active {
          background: #001b3a;
          color: #fff;
          border-color: #001b3a;
        }
        .check-in-error {
          color: #b91c1c;
          font-size: 0.9rem;
          margin-top: 12px;
        }
        .check-in-welcome h2 {
          color: #001b3a;
          margin: 0;
        }
        .check-in-success {
          text-align: center;
        }
        .check-in-success-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #16a34a;
          color: #fff;
          font-size: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
      `}</style>
    </div>
  );
}
