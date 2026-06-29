import React from 'react';
import { strateraTheme } from '../theme';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: { bg: strateraTheme.colors.gray100, color: strateraTheme.colors.gray600 },
    success: { bg: '#D1FAE5', color: '#065F46' },
    warning: { bg: '#FEF3C7', color: '#92400E' },
    danger: { bg: '#FEE2E2', color: '#991B1B' },
    info: { bg: '#E0F2FE', color: '#075985' },
  };

  const v = variants[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: v.bg,
        color: v.color,
      }}
    >
      {children}
    </span>
  );
}
