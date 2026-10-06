import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export type StatDeltaTone = 'success' | 'danger' | 'neutral';

export interface StatTileProps {
  icon?: IconName;
  label: ReactNode;
  value: ReactNode;
  /** Caption under the number, e.g. «из 3 кампаний». */
  meta?: ReactNode;
  /** Change vs the previous period, shown before `meta`. */
  delta?: { text: ReactNode; tone: StatDeltaTone; icon?: IconName };
  className?: string;
}

/** A labelled big number on a surface card. */
export function StatTile({ icon, label, value, meta, delta, className }: StatTileProps) {
  return (
    <div className={cx('ax-stat', className)}>
      <p className="ax-stat__label">
        {icon ? <Icon name={icon} size={18} /> : null}
        {label}
      </p>
      <p className="ax-stat__value">{value}</p>
      {meta || delta ? (
        <p className="ax-stat__meta">
          {delta ? (
            <span className={cx('ax-stat__delta', `ax-stat__delta--${delta.tone}`)}>
              {delta.icon ? <Icon name={delta.icon} size={16} /> : null}
              {delta.text}
            </span>
          ) : null}
          {meta ? <span>{meta}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
