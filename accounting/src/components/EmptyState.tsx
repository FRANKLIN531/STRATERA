import type { ReactNode } from 'react';
import { Button } from '@stratera/shared';

export function EmptyState({
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  icon,
  accent = 'accounts',
  tips,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  icon?: ReactNode;
  accent?: 'revenue' | 'accounts' | 'transactions' | 'invoices' | 'reports';
  tips?: string[];
}) {
  const accentClass =
    accent === 'revenue' ? 'present'
      : accent === 'transactions' ? 'salaries'
        : accent === 'invoices' ? 'pending'
          : accent === 'reports' ? 'reports'
            : 'departments';

  return (
    <div className={`hr-empty-state hr-empty-state--${accentClass}`}>
      {icon && <div className="hr-empty-state-icon">{icon}</div>}
      <h3 className="hr-empty-state-title">{title}</h3>
      <p className="hr-empty-state-desc">{description}</p>
      {tips && tips.length > 0 && (
        <ul className="hr-empty-state-tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} style={{ minWidth: 160, justifyContent: 'center' }}>
          {actionIcon}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
