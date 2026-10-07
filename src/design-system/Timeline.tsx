import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export type TimelineState = 'done' | 'current' | 'todo';

export interface TimelineItem {
  key: string;
  title: ReactNode;
  text?: ReactNode;
  state: TimelineState;
}

export interface TimelineProps {
  items: TimelineItem[];
  /** vertical — steps with text (default); horizontal — a compact line in a card footer. */
  orientation?: 'vertical' | 'horizontal';
  /** Accessible name, e.g. «До запуска». */
  label?: string;
  /** Spoken after each title, e.g. { done: ', готово', current: ', текущий шаг', todo: ', впереди' }. */
  stateLabels: Record<TimelineState, string>;
  className?: string;
}

/** Steps of a process: done (check), current (pulsing dot) and upcoming. */
export function Timeline({ items, orientation = 'vertical', label, stateLabels, className }: TimelineProps) {
  return (
    <ol className={cx('ax-timeline', `ax-timeline--${orientation}`, className)} aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className={`ax-timeline__item is-${item.state}`} aria-current={item.state === 'current' ? 'step' : undefined}>
          <span className="ax-timeline__dot" aria-hidden="true">
            {item.state === 'done' ? <Icon name="check" size={14} strokeWidth={2.5} /> : null}
            {item.state === 'current' ? <span className="ax-timeline__pulse" /> : null}
          </span>
          <div className="ax-timeline__body">
            <p className="ax-timeline__title">
              {item.title}
              <span className="ax-sr">{stateLabels[item.state]}</span>
            </p>
            {item.text ? <p className="ax-timeline__text">{item.text}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
