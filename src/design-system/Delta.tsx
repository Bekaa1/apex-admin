import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type DeltaTone = 'success' | 'danger' | 'neutral';
export type DeltaTrend = 'up' | 'down' | 'flat';

const TREND_ICON: Record<DeltaTrend, IconName> = { up: 'trending-up', down: 'trending-down', flat: 'minus' };
const TONE_TREND: Partial<Record<DeltaTone, DeltaTrend>> = { success: 'up', danger: 'down' };

export interface DeltaProps {
  tone: DeltaTone;
  /** Arrow direction when it differs from the colour, e.g. a cheaper play: green with a down arrow. */
  trend?: DeltaTrend;
  /** No previous value to compare with: «новая», without an arrow. */
  fresh?: boolean;
  /** The change, e.g. «−3 %». */
  children: ReactNode;
  /** Read after the change by screen readers, e.g. «к прошлым 30 дням». */
  context?: string;
  className?: string;
}

/** Change vs the previous period next to a number. */
export function Delta({ tone, trend = TONE_TREND[tone], fresh = false, children, context, className }: DeltaProps) {
  const icon = !fresh && trend ? TREND_ICON[trend] : null;
  return (
    <span className={cx('ax-delta', `ax-delta--${tone}`, fresh && 'ax-delta--new', className)}>
      {icon ? <Icon name={icon} size={14} strokeWidth={2} /> : null}
      <span>{children}</span>
      {context ? <span className="ax-sr"> {context}</span> : null}
    </span>
  );
}
