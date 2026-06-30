import type { ReactNode } from 'react';

export type MetricAccent =
  | 'revenue'
  | 'expenses'
  | 'profit'
  | 'invoices'
  | 'accounts'
  | 'transactions'
  | 'reports'
  | 'settings'
  | 'pending'
  | 'danger';

export interface MetricCardProps {
  label: string;
  value: string;
  meta: string;
  metaType?: 'positive' | 'neutral' | 'negative';
  icon?: ReactNode;
  accent?: MetricAccent;
  compactValue?: boolean;
}

export function MetricCard({
  label,
  value,
  meta,
  metaType = 'neutral',
  icon,
  accent = 'revenue',
  compactValue = false,
}: MetricCardProps) {
  const accentClass =
    accent === 'revenue' ? 'present'
      : accent === 'expenses' ? 'danger'
        : accent === 'profit' ? 'payroll'
          : accent === 'invoices' ? 'pending'
            : accent === 'accounts' ? 'departments'
              : accent === 'transactions' ? 'salaries'
                : accent;

  return (
    <div className="col">
      <div className={`card hr-dashboard-stat hr-dashboard-stat--${accentClass} h-100 shadow-sm`}>
        <div className="card-body py-3 px-3">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <p className="hr-stat-label mb-0">{label}</p>
            {icon && <div className="hr-stat-icon">{icon}</div>}
          </div>
          <p className={`hr-stat-value mb-0${compactValue ? ' hr-stat-value--compact' : ''}`}>{value}</p>
          <p className={`hr-stat-meta ${metaType === 'negative' ? 'neutral' : metaType}`}>{meta}</p>
        </div>
      </div>
    </div>
  );
}
