import React from 'react';
import { strateraTheme } from '../theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  style,
  type = 'button',
  ...props
}: ButtonProps) {
  const variants = {
    primary: {
      background: strateraTheme.colors.navy,
      color: strateraTheme.colors.white,
      border: 'none',
    },
    secondary: {
      background: strateraTheme.colors.gray100,
      color: strateraTheme.colors.navy,
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: strateraTheme.colors.navy,
      border: `1px solid ${strateraTheme.colors.gray300}`,
    },
    danger: {
      background: strateraTheme.colors.danger,
      color: strateraTheme.colors.white,
      border: 'none',
    },
  };

  const sizes = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '10px 20px', fontSize: 14 },
    lg: { padding: '14px 28px', fontSize: 15 },
  };

  return (
    <button
      style={{
        ...variants[variant],
        ...sizes[size],
        borderRadius: 8,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        transition: 'opacity 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      {...props}
      type={type}
    >
      {children}
    </button>
  );
}
