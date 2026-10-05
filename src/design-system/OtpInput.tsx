import { Fragment, useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface OtpInputProps {
  /** Number of digits (Supabase email OTP: 6). */
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fires when all digits are entered — verify immediately. */
  onComplete?: (value: string) => void;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Accessible name prefix for each cell: «Цифра 1 / 6». */
  cellLabel?: string;
  id?: string;
  className?: string;
}

export function OtpInput({ length = 6, value, defaultValue, onChange, onComplete, label, hint, error, disabled, autoFocus, cellLabel = 'Цифра', id, className }: OtpInputProps) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const [val, setVal] = useState((value ?? defaultValue ?? '').slice(0, length));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (value !== undefined) setVal(value.slice(0, length));
  }, [value, length]);

  const commit = (next: string) => {
    setVal(next);
    onChange?.(next);
    if (next.replace(/\s/g, '').length === length) onComplete?.(next);
  };

  const fill = (start: number, digits: string) => {
    const chars = val.padEnd(length, ' ').split('');
    for (let k = 0; k < digits.length && start + k < length; k++) chars[start + k] = digits[k];
    const next = chars.join('').replace(/\s+$/, '');
    commit(next);
    refs.current[Math.min(start + digits.length, length - 1)]?.focus();
  };

  const onInput = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits) fill(i, digits);
  };

  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    e.preventDefault();
    fill(i, digits);
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    const chars = val.padEnd(length, ' ').split('');
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (chars[i].trim()) {
        chars[i] = ' ';
      } else if (i > 0) {
        chars[i - 1] = ' ';
        refs.current[i - 1]?.focus();
      }
      commit(chars.join('').replace(/\s+$/, ''));
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const describedBy = error ? `${baseId}-err` : hint ? `${baseId}-hint` : undefined;

  return (
    <div className={cx('ax-field', className)}>
      {label ? (
        <span className="ax-label" id={`${baseId}-label`}>
          {label}
        </span>
      ) : null}
      <div className="ax-otp" role="group" aria-labelledby={label ? `${baseId}-label` : undefined}>
        {Array.from({ length }, (_, i) => (
          <Fragment key={i}>
            {length === 6 && i === 3 ? <span className="ax-otp__sep" aria-hidden="true" /> : null}
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="ax-otp__cell"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={length}
              value={(val[i] ?? '').trim()}
              aria-label={`${cellLabel} ${i + 1} / ${length}`}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              disabled={disabled}
              autoFocus={autoFocus && i === 0}
              onChange={(e) => onInput(i, e.target.value)}
              onPaste={(e) => onPaste(i, e)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
            />
          </Fragment>
        ))}
      </div>
      {error ? (
        <p className="ax-error" id={`${baseId}-err`}>
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="ax-hint" id={`${baseId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
