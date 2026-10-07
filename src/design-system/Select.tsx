import { useId, type SelectHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export interface SelectOption<V extends string> {
  value: V;
  label: string;
}

export interface SelectProps<V extends string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'size'> {
  label: string;
  /** Keep the label for screen readers only, e.g. in toolbars. */
  hideLabel?: boolean;
  options: Array<SelectOption<V>>;
  value: V;
  onValueChange: (value: V) => void;
  /** Icon at the start of the field. */
  icon?: IconName;
  /** md 44px (toolbars), lg 52px (forms, default). */
  size?: 'md' | 'lg';
}

/** Native select in the kit look: the browser's own list works with touch, keyboard and screen readers. */
export function Select<V extends string>({ id, label, hideLabel, options, value, onValueChange, icon, size = 'lg', className, ...select }: SelectProps<V>) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const labelNode = (
    <label className={hideLabel ? 'ax-sr' : 'ax-label'} htmlFor={selectId}>
      {label}
    </label>
  );
  return (
    <div className={cx('ax-field', className)}>
      {hideLabel ? labelNode : <div className="ax-field__top">{labelNode}</div>}
      <div className={cx('ax-select', `ax-select--${size}`, icon && 'ax-select--icon')}>
        {icon ? <Icon name={icon} size={18} className="ax-select__icon" /> : null}
        <select
          {...select}
          id={selectId}
          className="ax-select__input"
          value={value}
          onChange={(event) => {
            const next = options.find((option) => option.value === event.target.value);
            if (next) onValueChange(next.value);
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={18} className="ax-select__chevron" />
      </div>
    </div>
  );
}
