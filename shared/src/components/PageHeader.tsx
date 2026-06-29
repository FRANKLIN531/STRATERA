import React from 'react';
import { strateraTheme } from '../theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
      }}
    >
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: strateraTheme.colors.navy }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 14, color: strateraTheme.colors.gray500, marginTop: 4 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
