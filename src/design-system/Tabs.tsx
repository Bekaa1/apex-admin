import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from './cx';

export interface TabItem<V extends string> {
  value: V;
  label: ReactNode;
  /** Pill after the label, e.g. the number of campaigns. */
  count?: ReactNode;
}

export interface TabsProps<V extends string> {
  items: Array<TabItem<V>>;
  value: V;
  onChange: (value: V) => void;
  /** Accessible name of the list, e.g. «Фильтр по статусу». */
  label: string;
  /** id of the panel the tabs filter; name the panel after the selected tab. */
  panelId: string;
  className?: string;
}

function targetIndex(key: string, current: number, last: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return current === last ? 0 : current + 1;
    case 'ArrowLeft':
      return current === 0 ? last : current - 1;
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}

/** Filter tabs over one shared panel. Only the selected tab is in the Tab order; arrows, Home and End select another one. */
export function Tabs<V extends string>({ items, value, onChange, label, panelId, className }: TabsProps<V>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = targetIndex(event.key, items.findIndex((item) => item.value === value), items.length - 1);
    if (next === null) return;
    event.preventDefault();
    onChange(items[next].value);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div className={cx('ax-tabs', className)} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            className="ax-tabs__tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
          >
            <span>{item.label}</span>
            {item.count === undefined ? null : <span className="ax-tabs__count">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
