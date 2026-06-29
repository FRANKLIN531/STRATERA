export const strateraTheme = {
  colors: {
    navy: '#0a1f38',
    navyLight: '#0f2847',
    navyDark: '#040d18',
    white: '#FFFFFF',
    gray50: '#F8FAFC',
    gray100: '#F1F5F9',
    gray200: '#E2E8F0',
    gray300: '#CBD5E1',
    gray400: '#94A3B8',
    gray500: '#64748B',
    gray600: '#475569',
    gray700: '#334155',
    accent: '#0a1f38',
    accentLight: '#cbd5e1',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
  },
  fonts: {
    sans: "'Inter', sans-serif",
  },
  sidebarWidth: 260,
  headerHeight: 64,
} as const;

export type StrateraTheme = typeof strateraTheme;
