import { cx } from './cx';

export type MeterTone = 'primary' | 'success' | 'warning' | 'danger';

export interface MeterProps {
  /** 0–100. */
  value: number;
  tone?: MeterTone;
  /** md 8px, sm 6px (inside tables). */
  size?: 'sm' | 'md';
  /** Accessible text, e.g. «Израсходовано 88% бюджета». */
  label: string;
  className?: string;
}

/** Progress of a budget or delivery. The track is the soft step of the fill colour. */
export function Meter({ value, tone = 'primary', size = 'md', label, className }: MeterProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cx('ax-meter', `ax-meter--${size}`, tone !== 'primary' && `ax-meter--${tone}`, className)}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <span className="ax-meter__fill" style={{ width: `${pct}%`, minWidth: pct > 0 ? 4 : 0 }} />
    </div>
  );
}
