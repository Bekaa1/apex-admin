import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> {
  pressed: boolean;
  label: ReactNode;
  /** Second line, e.g. «ещё 2 бренда». */
  meta?: ReactNode;
}

/** Toggle pill for picking several options. Put chips in a role="group" with a label. */
export function Chip({ pressed, label, meta, className, ...button }: ChipProps) {
  return (
    <button {...button} type="button" className={cx('ax-chip', className)} aria-pressed={pressed}>
      <span className="ax-chip__mark" aria-hidden="true">
        {pressed ? <Icon name="check" size={14} strokeWidth={2.5} /> : null}
      </span>
      <span className="ax-chip__text">
        <span className="ax-chip__label">{label}</span>
        {meta ? <span className="ax-chip__meta">{meta}</span> : null}
      </span>
    </button>
  );
}
