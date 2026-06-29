import { strateraTheme } from '../theme';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 64,
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: `3px solid ${strateraTheme.colors.gray200}`,
          borderTopColor: strateraTheme.colors.navy,
          borderRadius: '50%',
          animation: 'stratera-spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: 14, color: strateraTheme.colors.gray500 }}>{message}</p>
      <style>{`
        @keyframes stratera-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
