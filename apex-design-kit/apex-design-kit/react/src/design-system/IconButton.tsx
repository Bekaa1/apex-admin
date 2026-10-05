import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Required accessible name (aria-label + tooltip). */
  label: string;
  /** outline — standalone actions (theme, menu); ghost — inside fields and alerts. */
  variant?: 'outline' | 'ghost';
}

export function IconButton({ icon, label, variant = 'outline', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button {...rest} type={type} aria-label={label} title={label} className={cx('ax-iconbtn', variant === 'ghost' && 'ax-iconbtn--ghost', className)}>
      <Icon name={icon} />
    </button>
  );
}
