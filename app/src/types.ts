export type DesktopModule = 'accounting' | 'hr';

export type AppScreen = 'welcome' | 'select' | 'login' | 'signup' | 'reset' | 'desktop';

export const MODULE_LABELS: Record<DesktopModule, { title: string; subtitle: string }> = {
  accounting: { title: 'Accounting Desktop', subtitle: 'Finance & reporting' },
  hr: { title: 'HR Desktop', subtitle: 'People & payroll' },
};
