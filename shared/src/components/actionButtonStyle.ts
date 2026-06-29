import { strateraTheme } from '../theme';

export const actionLinkStyle = {
  fontSize: 12,
  padding: '2px 0',
  border: 'none',
  background: 'none',
  fontWeight: 600,
  cursor: 'pointer',
} as const;

export const actionColors = {
  edit: strateraTheme.colors.navy,
  delete: strateraTheme.colors.danger,
  email: strateraTheme.colors.accent,
};
