import { strateraTheme } from '../theme';
import { Button } from './Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
  error?: string;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
  error,
}: ConfirmDialogProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 27, 58, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: strateraTheme.colors.white,
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, color: strateraTheme.colors.navy, marginBottom: 8 }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: strateraTheme.colors.gray600, lineHeight: 1.5, marginBottom: error ? 12 : 24 }}>
          {message}
        </p>
        {error && (
          <p
            style={{
              fontSize: 13,
              color: strateraTheme.colors.danger,
              lineHeight: 1.45,
              marginBottom: 24,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#FEE2E2',
            }}
            role="alert"
          >
            {error}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button variant="outline" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
