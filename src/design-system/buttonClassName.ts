import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'danger';
export type ButtonSize = 'md' | 'lg' | 'xl';

export interface ButtonLook {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  className?: string;
}

/** Class list of a button; lets a router link look exactly like `Button`. */
export function buttonClassName({ variant = 'primary', size = 'lg', fullWidth, loading, className }: ButtonLook): string {
  return cx('ax-btn', `ax-btn--${variant}`, `ax-btn--${size}`, fullWidth && 'ax-btn--full', loading && 'ax-btn--loading', className);
}
