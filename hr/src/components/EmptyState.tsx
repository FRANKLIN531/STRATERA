import type { ReactNode } from 'react';
import { Button } from '@stratera/shared';
import type { MetricAccent } from './MetricCard';

export function EmptyState({
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  icon,
  accent = 'employees',
  tips,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  icon?: ReactNode;
  accent?: MetricAccent;
  tips?: string[];
}) {
  return (
    <div className={`hr-empty-state hr-empty-state--${accent}`}>
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
        <Button
          size="sm"
          onClick={onAction}
          style={{ minWidth: 160, justifyContent: 'center' }}
        >
          {actionIcon}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
