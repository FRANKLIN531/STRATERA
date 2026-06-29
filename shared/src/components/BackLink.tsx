interface BackLinkProps {
  /** Destination name — shown as "Back to {label}" when `text` is not set */
  label?: string;
  /** Full link text override, e.g. "Change desktop" */
  text?: string;
  onClick: () => void;
  variant?: 'pill' | 'muted' | 'ghost';
  className?: string;
}

function ChevronLeftIcon() {
  return (
    <svg
      className="stratera-back-link__icon"
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function BackLink({
  label,
  text,
  onClick,
  variant = 'muted',
  className = '',
}: BackLinkProps) {
  const content = text ?? (label ? `Back to ${label}` : 'Back');
  const variantClass =
    variant === 'pill' ? 'stratera-back-link--pill' :
    variant === 'ghost' ? 'stratera-back-link--ghost' :
    'stratera-back-link--muted';

  return (
    <button
      type="button"
      className={`stratera-back-link ${variantClass}${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      <ChevronLeftIcon />
      <span>{content}</span>
    </button>
  );
}
