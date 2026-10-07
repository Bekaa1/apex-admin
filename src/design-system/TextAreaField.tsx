import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children' | 'value'> {
  label: ReactNode;
  value: string;
  /** Mark of an optional field, e.g. «Необязательно». */
  optional?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** «56 / 300» under the field; needs `maxLength`. */
  showCount?: boolean;
}

/** Multi-line text field with the TextField layout: label, hint or error, optional character counter. */
export function TextAreaField({ id, label, value, optional, hint, error, showCount, maxLength, className, ...textarea }: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const messageId = `${fieldId}-${error ? 'err' : 'hint'}`;
  const countId = `${fieldId}-count`;
  const count = showCount && maxLength ? `${value.length} / ${maxLength}` : null;
  const describedBy = [error || hint ? messageId : null, count ? countId : null].filter(Boolean).join(' ');
  return (
    <div className={cx('ax-field', className)}>
      <div className="ax-field__top">
        <label className="ax-label" htmlFor={fieldId}>
          {label}
        </label>
        {optional ? <span className="ax-field__optional">{optional}</span> : null}
      </div>
      <textarea
        {...textarea}
        id={fieldId}
        className="ax-input ax-textarea"
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      <div className="ax-field__bottom">
        {error ? (
          <p className="ax-error" id={messageId}>
            <Icon name="alert-circle" size={18} />
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p className="ax-hint" id={messageId}>
            {hint}
          </p>
        ) : null}
        {count ? (
          <span className="ax-field__count" id={countId}>
            {count}
          </span>
        ) : null}
      </div>
    </div>
  );
}
