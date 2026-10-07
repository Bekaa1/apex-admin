import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type DeltaTone = 'success' | 'danger' | 'neutral';

const TONE_ICON: Partial<Record<DeltaTone, IconName>> = { success: 'trending-up', danger: 'trending-down' };

export interface DeltaProps {
  tone: DeltaTone;
  /** The change, e.g. «−3 %». */
  children: ReactNode;
  /** Read after the change by screen readers, e.g. «к прошлым 30 дням». */
  context?: string;
  className?: string;
}

/** Change vs the previous period next to a number. */
export function Delta({ tone, children, context, className }: DeltaProps) {
  const icon = TONE_ICON[tone];
  return (
    <span className={cx('ax-delta', `ax-delta--${tone}`, className)}>
      {icon ? <Icon name={icon} size={14} strokeWidth={2} /> : null}
      <span>{children}</span>
      {context ? <span className="ax-sr"> {context}</span> : null}
    </span>
  );
}
