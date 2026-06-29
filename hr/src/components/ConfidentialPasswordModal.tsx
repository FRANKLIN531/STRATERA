import { useState } from 'react';
import { Modal, formFieldStyle } from '@stratera/shared';
import { verifyUserPassword } from '../api';

interface ConfidentialPasswordModalProps {
  title: string;
  description: string;
  submitLabel?: string;
  onClose: () => void;
  onVerified: () => void;
}

export function ConfidentialPasswordModal({
  title,
  description,
  submitLabel = 'Continue',
  onClose,
  onVerified,
}: ConfidentialPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await verifyUserPassword(password);
      if (!result.ok) {
        setError(result.error ?? 'Incorrect password.');
        setPassword('');
        return;
      }
      onVerified();
    } catch {
      setError('Unable to verify password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel={submitLabel}
    >
      <p className="text-secondary small mb-3">{description}</p>
      <label style={formFieldStyle.field}>
        <span style={formFieldStyle.label}>Your password</span>
        <input
          type="password"
          style={formFieldStyle.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your sign-in password"
          autoComplete="current-password"
          autoFocus
        />
      </label>
      {error && (
        <div className="alert alert-warning py-2 px-3 small mt-3 mb-0" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
