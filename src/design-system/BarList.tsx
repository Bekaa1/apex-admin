import type { ReactNode } from 'react';
import { cx } from './cx';

export interface BarListItem {
  key: string;
  name: ReactNode;
  /** Second line under the name, e.g. «в 3 магазинах». */
  sub?: ReactNode;
  /** The number on the right, with an optional `Delta`. */
  value: ReactNode;
  /** Bar length, 0–1 of the longest item. */
  share: number;
}

export interface BarListProps {
  items: BarListItem[];
  /** Accessible name of the list, e.g. «Показы по зонам». */
  label: string;
  className?: string;
}

/** Ranked list with a bar under each row; the bars are decorative, the value is in the text. */
export function BarList({ items, label, className }: BarListProps) {
  return (
    <ol className={cx('ax-barlist', className)} aria-label={label}>
      {items.map((item) => {
        const pct = Math.min(100, Math.max(0, item.share * 100));
        return (
          <li key={item.key} className="ax-barlist__item">
            <div className="ax-barlist__row">
              <span className="ax-barlist__label">
                <span className="ax-barlist__name">{item.name}</span>
                {item.sub ? <span className="ax-barlist__sub">{item.sub}</span> : null}
              </span>
              <span className="ax-barlist__value">{item.value}</span>
            </div>
            <span className="ax-meter ax-meter--sm" aria-hidden="true">
              <span className="ax-meter__fill" style={{ width: `${pct}%`, minWidth: pct > 0 ? 4 : 0 }} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
