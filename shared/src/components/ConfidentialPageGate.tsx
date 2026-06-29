import { useState, type FormEvent } from 'react';
import { Button } from './Button';

export interface ConfidentialPageGateProps {
  title: string;
  description: string;
  onVerify: (password: string) => Promise<{ ok: boolean; error?: string }>;
  onCancel?: () => void;
}

export function ConfidentialPageGate({
  title,
  description,
  onVerify,
  onCancel,
}: ConfidentialPageGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await onVerify(password);
      if (!result?.ok) {
        setError(result?.error ?? 'Incorrect password.');
        setPassword('');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      setError(msg || 'Unable to verify password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hr-confidential-gate">
      <div className="card hr-panel-card shadow-sm hr-confidential-gate__card">
        <div className="card-body text-center p-4 p-md-5">
          <div className="hr-confidential-gate__icon" aria-hidden>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="h5 fw-semibold text-dark mb-2">{title}</h2>
          <p className="text-secondary small mb-4 mx-auto hr-confidential-gate__lead">{description}</p>

          <form onSubmit={handleSubmit} className="hr-confidential-gate__form mx-auto">
            <label className="form-label text-start w-100 small fw-semibold text-secondary mb-1">
              Your password
            </label>
            <input
              type="password"
              className="form-control mb-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your sign-in password"
              autoComplete="current-password"
              autoFocus
              disabled={loading}
            />
            {error && (
              <div className="alert alert-warning py-2 px-3 small text-start mb-3" role="alert">
                {error}
              </div>
            )}
            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
              <Button type="submit" disabled={loading || !password.trim()}>
                {loading ? 'Verifying…' : 'Unlock'}
              </Button>
              {onCancel && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Go back
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
