import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface ChoiceCardProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'title' | 'children'> {
  type?: 'radio' | 'checkbox';
  title: ReactNode;
  /** Decorative line above the title, e.g. a level meter. */
  top?: ReactNode;
  /** Details under the title; they describe the input for screen readers. */
  children?: ReactNode;
}

/** A card that works as a radio button or a checkbox; the whole card is clickable. Group cards in a fieldset with a legend. */
export function ChoiceCard({ type = 'radio', title, top, children, className, checked, disabled, id, ...input }: ChoiceCardProps) {
  const autoId = useId();
  const bodyId = `${id ?? autoId}-desc`;
  return (
    <div className={cx('ax-choice', checked && 'is-checked', disabled && 'is-disabled', className)}>
      {top ? (
        <div className="ax-choice__top" aria-hidden="true">
          {top}
        </div>
      ) : null}
      <label className="ax-choice__label">
        <input
          {...input}
          id={id}
          className="ax-choice__input"
          type={type}
          checked={checked}
          disabled={disabled}
          aria-describedby={children ? bodyId : undefined}
        />
        <span className={`ax-choice__mark ax-choice__mark--${type}`} aria-hidden="true">
          {checked ? <Icon name="check" size={14} strokeWidth={2.75} /> : null}
        </span>
        <span className="ax-choice__title">{title}</span>
      </label>
      {children ? (
        <div className="ax-choice__body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
