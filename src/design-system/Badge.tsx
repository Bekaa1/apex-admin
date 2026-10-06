import type { ReactNode } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'accent';

export interface BadgeProps {
  tone?: BadgeTone;
  /** 6px dot before the text (statuses). */
  dot?: boolean;
  children?: ReactNode;
  className?: string;
}

/** One or two words of status. Colour never carries the meaning alone — the text does. */
export function Badge({ tone = 'neutral', dot, children, className }: BadgeProps) {
  return (
    <span className={cx('ax-badge', tone !== 'neutral' && `ax-badge--${tone}`, className)}>
      {dot ? <span className="ax-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
