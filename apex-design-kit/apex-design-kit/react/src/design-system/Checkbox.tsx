import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  /** Label text; may contain links. The whole label is clickable. */
  children: ReactNode;
  error?: ReactNode;
}

export function Checkbox({ id, children, error, className, ...input }: CheckboxProps) {
  const autoId = useId();
  const boxId = id ?? autoId;
  return (
    <div className={cx('ax-field', className)}>
      <label className="ax-check" htmlFor={boxId}>
        <input {...input} id={boxId} type="checkbox" aria-invalid={error ? true : undefined} aria-describedby={error ? `${boxId}-err` : undefined} />
        <span>{children}</span>
      </label>
      {error ? (
        <p className="ax-error" id={`${boxId}-err`}>
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
