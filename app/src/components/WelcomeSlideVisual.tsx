import type { CSSProperties } from 'react';
import '../styles/welcome-visual.css';

export type WelcomeSlideTag = 'Finance' | 'People' | 'Platform';

interface WelcomeSlideVisualProps {
  variant: WelcomeSlideTag;
  accent: string;
}

const FINANCE_BARS = [42, 58, 78, 62, 88];

export function WelcomeSlideVisual({ variant, accent }: WelcomeSlideVisualProps) {
  const style = { '--scene-accent': accent } as CSSProperties;

  if (variant === 'Finance') {
    return (
      <div className="welcome-scene welcome-scene-finance" style={style}>
        <div className="welcome-scene-bg" aria-hidden="true" />
        <div className="welcome-chart" aria-hidden="true">
          {FINANCE_BARS.map((height, index) => (
            <div
              key={index}
              className="welcome-chart-bar"
              style={
                {
                  '--bar-height': `${height}%`,
                  '--bar-delay': `${index * 0.12}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <svg className="welcome-trend-svg" viewBox="0 0 320 120" aria-hidden="true">
          <path
            className="welcome-trend-path"
            d="M10 90 L70 55 L130 68 L190 28 L250 48 L310 12"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle className="welcome-trend-dot" cx="310" cy="12" r="6" fill={accent} />
        </svg>
        <div className="welcome-finance-doc" aria-hidden="true">
          <div className="welcome-finance-doc-line welcome-finance-doc-line--lg" />
          <div className="welcome-finance-doc-line" />
          <div className="welcome-finance-doc-line welcome-finance-doc-line--sm" />
          <div className="welcome-finance-doc-chip" />
        </div>
      </div>
    );
  }

  if (variant === 'People') {
    return (
      <div className="welcome-scene welcome-scene-people" style={style}>
        <div className="welcome-scene-bg" aria-hidden="true" />
        <svg className="welcome-people-links" viewBox="0 0 400 280" aria-hidden="true">
          <path className="welcome-link-path" d="M120 120 L200 90 L280 130" stroke="#10B981" strokeWidth="2" fill="none" />
          <path className="welcome-link-path welcome-link-path--2" d="M120 120 L160 200 L240 210" stroke="#10B981" strokeWidth="2" fill="none" />
          <path className="welcome-link-path welcome-link-path--3" d="M200 90 L240 210" stroke="#34D399" strokeWidth="2" fill="none" />
        </svg>
        <div className="welcome-avatar welcome-avatar--1" aria-hidden="true" />
        <div className="welcome-avatar welcome-avatar--2 welcome-avatar--outline" aria-hidden="true" />
        <div className="welcome-avatar welcome-avatar--3" aria-hidden="true" />
        <div className="welcome-avatar welcome-avatar--4 welcome-avatar--outline" aria-hidden="true" />
        <div className="welcome-avatar welcome-avatar--5" aria-hidden="true" />
        <div className="welcome-people-calendar" aria-hidden="true">
          <div className="welcome-people-calendar-head" />
          <div className="welcome-people-calendar-grid">
            {[0, 1, 2, 3, 4, 5].map((cell) => (
              <div
                key={cell}
                className={`welcome-people-calendar-cell${cell === 2 ? ' welcome-people-calendar-cell--active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-scene welcome-scene-platform" style={style}>
      <div className="welcome-scene-bg" aria-hidden="true" />
      <svg className="welcome-platform-links" viewBox="0 0 400 300" aria-hidden="true">
        <line className="welcome-hub-line" x1="200" y1="150" x2="80" y2="70" stroke={accent} strokeWidth="2" />
        <line className="welcome-hub-line welcome-hub-line--2" x1="200" y1="150" x2="320" y2="60" stroke={accent} strokeWidth="2" />
        <line className="welcome-hub-line welcome-hub-line--3" x1="200" y1="150" x2="330" y2="210" stroke={accent} strokeWidth="2" />
        <line className="welcome-hub-line welcome-hub-line--4" x1="200" y1="150" x2="70" y2="220" stroke={accent} strokeWidth="2" />
        <line className="welcome-hub-line welcome-hub-line--5" x1="200" y1="150" x2="200" y2="30" stroke={accent} strokeWidth="2" />
      </svg>
      <div className="welcome-hub welcome-hub--center" aria-hidden="true" />
      <div className="welcome-hub welcome-hub--node welcome-hub--n1" aria-hidden="true" />
      <div className="welcome-hub welcome-hub--node welcome-hub--n2" aria-hidden="true" />
      <div className="welcome-hub welcome-hub--node welcome-hub--n3" aria-hidden="true" />
      <div className="welcome-hub welcome-hub--node welcome-hub--n4" aria-hidden="true" />
      <div className="welcome-hub welcome-hub--node welcome-hub--n5" aria-hidden="true" />
      <div className="welcome-platform-desktops" aria-hidden="true">
        {['Accounting', 'HR', 'Sales'].map((label, index) => (
          <div
            key={label}
            className="welcome-platform-desktop"
            style={{ '--desktop-delay': `${0.5 + index * 0.15}s` } as CSSProperties}
          >
            <div className="welcome-platform-desktop-screen" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
