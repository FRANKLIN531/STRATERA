import type { ReactNode, FormEvent } from 'react';
import { strateraTheme } from '../theme';
import { Button } from './Button';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  loading?: boolean;
  width?: number;
}

export function Modal({
  title,
  children,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  loading = false,
  width = 520,
}: ModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 27, 58, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: strateraTheme.colors.white,
          borderRadius: 12,
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={onSubmit ? handleSubmit : (e) => e.preventDefault()}>
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${strateraTheme.colors.gray200}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, color: strateraTheme.colors.navy }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 24,
              lineHeight: 1,
              color: strateraTheme.colors.gray400,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 24 }}>{children}</div>

        {onSubmit && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${strateraTheme.colors.gray200}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : submitLabel}
            </Button>
          </div>
        )}
        </form>
      </div>
    </div>
  );
}

export const formFieldStyle = {
  label: { fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 } as const,
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${strateraTheme.colors.gray300}`,
    fontSize: 14,
    color: strateraTheme.colors.gray700,
    width: '100%',
  } as const,
  grid: { display: 'grid', gap: 16 } as const,
  field: { display: 'grid', gap: 6 } as const,
};
