import type { ReactNode } from 'react';

export type MetricAccent =
  | 'employees'
  | 'present'
  | 'leave'
  | 'pending'
  | 'payroll'
  | 'salaries'
  | 'departments'
  | 'reports'
  | 'settings'
  | 'danger';

export interface MetricCardProps {
  label: string;
  value: string;
  meta: string;
  metaType?: 'positive' | 'neutral';
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
  accent = 'employees',
  compactValue = false,
}: MetricCardProps) {
  return (
    <div className="col">
      <div className={`card hr-dashboard-stat hr-dashboard-stat--${accent} h-100 shadow-sm`}>
        <div className="card-body py-3 px-3">
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <p className="hr-stat-label mb-0">{label}</p>
            {icon && <div className="hr-stat-icon">{icon}</div>}
          </div>
          <p className={`hr-stat-value mb-0${compactValue ? ' hr-stat-value--compact' : ''}`}>{value}</p>
          <p className={`hr-stat-meta ${metaType}`}>{meta}</p>
        </div>
      </div>
    </div>
  );
}

export function MetricCardInline({
  label,
  value,
  accent = 'employees',
  compactValue = true,
}: Pick<MetricCardProps, 'label' | 'value' | 'accent' | 'compactValue'>) {
  return (
    <div className={`card hr-dashboard-stat hr-dashboard-stat--${accent} h-100 shadow-sm`}>
      <div className="card-body py-2 px-3">
        <p className="hr-stat-label mb-1">{label}</p>
        <p className={`hr-stat-value mb-0${compactValue ? ' hr-stat-value--compact' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
