import React from 'react';
import { strateraTheme } from '../theme';
import { StrateraBrand } from './StrateraBrand';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface LayoutProps {
  appName: string;
  appSubtitle: string;
  navItems: NavItem[];
  activeNav: string;
  onNavChange: (id: string) => void;
  children: React.ReactNode;
  userName?: string;
  onLogout?: () => void;
  headerExtra?: React.ReactNode;
}

export function Layout({
  appName,
  appSubtitle,
  navItems,
  activeNav,
  onNavChange,
  children,
  userName,
  onLogout,
  headerExtra,
}: LayoutProps) {
  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'SA';

  return (
    <div style={{ display: 'flex', height: '100vh', background: strateraTheme.colors.gray50 }}>
      <aside
        style={{
          width: strateraTheme.sidebarWidth,
          background: strateraTheme.colors.navy,
          color: strateraTheme.colors.white,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            padding: '20px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <StrateraBrand size="md" layout="horizontal" subtitle={appSubtitle} />
        </div>

        <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '11px 14px',
                  marginBottom: 2,
                  border: 'none',
                  borderRadius: 10,
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: strateraTheme.colors.white,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  transition: 'background 0.15s, transform 0.15s',
                  boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,255,255,0.08)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    opacity: isActive ? 1 : 0.75,
                    display: 'flex',
                    color: isActive ? strateraTheme.colors.accentLight : 'inherit',
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.38)',
          }}
        >
          STRATERA R&D Software Group
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header
          style={{
            height: strateraTheme.headerHeight,
            background: strateraTheme.colors.white,
            borderBottom: `1px solid ${strateraTheme.colors.gray200}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            flexShrink: 0,
            boxShadow: '0 1px 0 rgba(0,27,58,0.04)',
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: strateraTheme.colors.navy, lineHeight: 1.2 }}>
              {appName}
            </h1>
            <p style={{ fontSize: 12, color: strateraTheme.colors.gray400, marginTop: 2 }}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {headerExtra}
            {userName && (
              <span style={{ fontSize: 13, fontWeight: 500, color: strateraTheme.colors.gray600 }}>
                {userName}
              </span>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: `1px solid ${strateraTheme.colors.gray200}`,
                  background: strateraTheme.colors.gray50,
                  fontSize: 13,
                  fontWeight: 500,
                  color: strateraTheme.colors.gray600,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = strateraTheme.colors.gray100;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = strateraTheme.colors.gray50;
                }}
              >
                Sign out
              </button>
            )}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${strateraTheme.colors.navy} 0%, ${strateraTheme.colors.navyLight} 100%)`,
                color: strateraTheme.colors.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,27,58,0.2)',
              }}
            >
              {initials}
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'auto', padding: 32, background: strateraTheme.colors.gray50 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
