import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  label: ReactNode;
  /** Shown under the field until there is an error. */
  hint?: ReactNode;
  /** Red border + message under the field. Say what to do, not what went wrong. */
  error?: ReactNode;
  /** Element inside the field on the right (usually a ghost IconButton). */
  trailing?: ReactNode;
  /** Link on the right of the label row, e.g. «Забыли пароль?». */
  labelAction?: ReactNode;
  /** Mark of an optional field next to the label, e.g. «Необязательно». */
  optional?: ReactNode;
  inputClassName?: string;
}

export function TextField({ id, label, hint, error, trailing, labelAction, optional, className, inputClassName, type = 'text', ...input }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = `${fieldId}-hint`;
  const errId = `${fieldId}-err`;
  return (
    <div className={cx('ax-field', className)}>
      <div className="ax-field__top">
        <label className="ax-label" htmlFor={fieldId}>
          {label}
        </label>
        {optional ? <span className="ax-field__optional">{optional}</span> : null}
        {labelAction}
      </div>
      <div className="ax-field__wrap">
        <input
          {...input}
          id={fieldId}
          type={type}
          className={cx('ax-input', trailing ? 'ax-input--trailing' : undefined, inputClassName)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : hint ? hintId : undefined}
        />
        {trailing ? <span className="ax-field__trailing">{trailing}</span> : null}
      </div>
      {error ? (
        <p className="ax-error" id={errId}>
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="ax-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Link styled for TextField `labelAction`. */
export function FieldAction({ href, children, onClick }: { href: string; children: ReactNode; onClick?: () => void }) {
  return (
    <a className="ax-field__action" href={href} onClick={onClick}>
      {children}
    </a>
  );
}

export interface PasswordFieldProps extends Omit<TextFieldProps, 'type' | 'trailing'> {
  showLabel?: string;
  hideLabel?: string;
}

/** TextField with a show/hide toggle. Sign-in: autoComplete="current-password"; new password: "new-password" + hint. */
export function PasswordField({ showLabel = 'Показать пароль', hideLabel = 'Скрыть пароль', autoComplete = 'current-password', ...props }: PasswordFieldProps) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      autoComplete={autoComplete}
      type={shown ? 'text' : 'password'}
      trailing={<IconButton variant="ghost" icon={shown ? 'eye-off' : 'eye'} label={shown ? hideLabel : showLabel} onClick={() => setShown(!shown)} />}
    />
  );
}
