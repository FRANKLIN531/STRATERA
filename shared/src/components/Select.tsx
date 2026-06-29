import { useEffect, useId, useRef, useState } from 'react';
import './select.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: 'sm' | 'md';
  id?: string;
  'aria-label'?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  style,
  size = 'md',
  id,
  'aria-label': ariaLabel,
}: SelectProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? placeholder;

  useEffect(() => {
    setOpen(false);
    setHighlightIndex(-1);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && highlightIndex >= 0) {
        choose(options[highlightIndex].value);
        return;
      }
      setOpen((current) => !current);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`stratera-select stratera-select--${size}${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''} ${className}`.trim()}
      style={style}
    >
      <button
        type="button"
        id={controlId}
        className="stratera-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className={`stratera-select-value${selected ? '' : ' is-placeholder'}`}>{displayLabel}</span>
        <span className="stratera-select-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <ul className="stratera-select-menu" role="listbox" aria-labelledby={controlId}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightIndex;
            return (
              <li key={option.value || `option-${index}`} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`stratera-select-option${isSelected ? ' is-selected' : ''}${isHighlighted ? ' is-highlighted' : ''}`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    choose(option.value);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
