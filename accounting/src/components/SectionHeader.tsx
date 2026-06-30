import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  size?: 'page' | 'section';
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  size = 'section',
  action,
  className = '',
}: SectionHeaderProps) {
  const TitleTag = size === 'page' ? 'h2' : 'h3';

  return (
    <div
      className={`hr-section-header${size === 'page' ? ' hr-section-header--page' : ''}${className ? ` ${className}` : ''}`}
    >
      <div className="hr-section-header__text">
        <TitleTag className="hr-section-header__title">{title}</TitleTag>
        <p className="hr-section-header__subtitle">{subtitle}</p>
      </div>
      {action ? <div className="hr-section-header__action">{action}</div> : null}
    </div>
  );
}
