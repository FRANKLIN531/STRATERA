import React from 'react';
import { strateraTheme } from '../theme';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export function StatCard({ label, value, change, changeType = 'neutral', icon }: StatCardProps) {
  const changeColor =
    changeType === 'positive'
      ? strateraTheme.colors.success
      : changeType === 'negative'
        ? strateraTheme.colors.danger
        : strateraTheme.colors.gray500;

  return (
    <div
      style={{
        background: strateraTheme.colors.white,
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${strateraTheme.colors.gray200}`,
        boxShadow: '0 1px 3px rgba(0,27,58,0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, color: strateraTheme.colors.gray500, marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ fontSize: 28, fontWeight: 700, color: strateraTheme.colors.navy }}>
            {value}
          </p>
          {change && (
            <p style={{ fontSize: 13, color: changeColor, marginTop: 8, fontWeight: 500 }}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: strateraTheme.colors.gray100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: strateraTheme.colors.navy,
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
