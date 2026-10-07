import { useRef, type InputHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'value' | 'onChange'> {
  /** Accessible name; also the placeholder unless one is given, e.g. «Поиск по названию». */
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Label of the clear button, e.g. «Очистить». */
  clearLabel: string;
  /** md 44px (toolbars), lg 52px (forms, default). */
  size?: 'md' | 'lg';
}

/** Search input with a leading icon. The clear button shows only when there is text and returns focus to the field. */
export function SearchField({ label, value, onValueChange, clearLabel, size = 'lg', placeholder, className, ...input }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={cx('ax-search', size === 'md' && 'ax-search--md', className)}>
      <Icon name="search" size={18} className="ax-search__icon" />
      <input
        {...input}
        ref={inputRef}
        type="search"
        className="ax-input ax-search__input"
        aria-label={label}
        placeholder={placeholder ?? label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          className="ax-search__clear"
          aria-label={clearLabel}
          title={clearLabel}
          onClick={() => {
            onValueChange('');
            inputRef.current?.focus();
          }}
        >
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </div>
  );
}
