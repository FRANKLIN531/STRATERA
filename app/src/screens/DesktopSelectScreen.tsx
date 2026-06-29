import { Icons, StrateraBrand, BackLink } from '@stratera/shared';
import type { DesktopModule } from '../types';

interface DesktopOption {
  id: DesktopModule | 'sales' | 'marketing';
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  available: boolean;
}

const DESKTOPS: DesktopOption[] = [
  {
    id: 'accounting',
    title: 'Accounting',
    description: 'Transactions, invoices, accounts, and financial reports',
    icon: <Icons.Accounts />,
    accent: '#0a1f38',
    available: true,
  },
  {
    id: 'hr',
    title: 'Human Resources',
    description: 'Employees, payroll, attendance, and leave management',
    icon: <Icons.Employees />,
    accent: '#10B981',
    available: true,
  },
  {
    id: 'sales',
    title: 'Sales',
    description: 'Pipeline, quotes, and customer relationships',
    icon: <Icons.TrendUp />,
    accent: '#F59E0B',
    available: false,
  },
  {
    id: 'marketing',
    title: 'Marketing',
    description: 'Campaigns, analytics, and brand assets',
    icon: <Icons.Reports />,
    accent: '#8B5CF6',
    available: false,
  },
];

interface DesktopSelectScreenProps {
  onSelect: (module: DesktopModule) => void;
  onBack: () => void;
}

export function DesktopSelectScreen({ onSelect, onBack }: DesktopSelectScreenProps) {
  return (
    <div className="portal-root portal-select">
      <div className="portal-grid-bg" />
      <div className="portal-glow portal-glow-a" />
      <div className="portal-glow portal-glow-b" />

      <BackLink label="Welcome" variant="ghost" onClick={onBack} className="portal-auth-back" />

      <div className="portal-welcome-layout portal-select-layout">
        <section className="portal-welcome-brand portal-select-brand portal-slide-up">
          <StrateraBrand size="lg" layout="vertical" />
          <p className="portal-step-label">Step 1 of 2</p>
          <h1 className="portal-page-title">Select your desktop</h1>
          <p className="portal-welcome-tagline">
            Choose the workspace you need today. Accounting and HR can run simultaneously on different machines.
          </p>
        </section>

        <section className="portal-select-panel portal-fade-in">
          <div className="portal-desktop-grid">
            {DESKTOPS.map((d) => (
              <button
                key={d.id}
                type="button"
                className="desktop-card portal-fade-in"
                disabled={!d.available}
                onClick={() => d.available && onSelect(d.id as DesktopModule)}
                style={{ '--card-accent': d.accent } as React.CSSProperties}
              >
                <div className="desktop-card-top">
                  <div className="desktop-card-icon" style={{ background: `${d.accent}18`, color: d.accent }}>
                    {d.icon}
                  </div>
                  {d.available ? (
                    <span className="desktop-card-status available">Available</span>
                  ) : (
                    <span className="desktop-card-status soon">Coming soon</span>
                  )}
                </div>
                <h2 className="desktop-card-title">{d.title}</h2>
                <p className="desktop-card-desc">{d.description}</p>
                {d.available && (
                  <span className="desktop-card-cta">
                    Continue
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
