import { strateraTheme } from '../theme';

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 8px',
  borderRadius: 6,
  border: `1px solid ${strateraTheme.colors.gray300}`,
  background: 'transparent',
  color: strateraTheme.colors.navy,
  fontWeight: 600,
  marginRight: 4,
};

const dangerBtn: React.CSSProperties = {
  ...btnStyle,
  borderColor: strateraTheme.colors.danger,
  color: strateraTheme.colors.danger,
};

interface ActionButtonsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  disabled?: boolean;
}

export function ActionButtons({ onEdit, onDelete, editLabel = 'Edit', disabled }: ActionButtonsProps) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {onEdit && (
        <button type="button" style={btnStyle} onClick={onEdit} disabled={disabled}>{editLabel}</button>
      )}
      {onDelete && (
        <button type="button" style={dangerBtn} onClick={onDelete} disabled={disabled}>Delete</button>
      )}
    </div>
  );
}

export const smallBtnStyle = btnStyle;
