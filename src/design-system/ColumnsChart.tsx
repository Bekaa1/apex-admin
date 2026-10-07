import { useState, type KeyboardEvent } from 'react';
import { cx } from './cx';

export interface ColumnsChartBar {
  key: string;
  value: number;
  /** Text under the column; shown only on ticks. */
  label: string;
  /** major — always shown; minor — hidden when the chart is narrow; none — never shown. */
  tick?: 'major' | 'minor';
  /** Tooltip: «1 713 показов» over «6 окт.». Screen readers hear «6 окт.: 1 713 показов». */
  tip: { value: string; unit?: string; caption: string };
}

export interface ColumnsChartProps {
  bars: ColumnsChartBar[];
  /** Accessible name of the plot, e.g. «Показы по дням». */
  label: string;
  /** Axis numbers and the peak label. */
  formatValue: (value: number) => string;
  /** Spoken while no column is picked, e.g. «Стрелки влево и вправо — переход по столбцам». */
  keyboardHint: string;
  plotHeight?: number;
  className?: string;
}

const NICE_STEPS = [1, 2, 4, 6, 8, 10];

/** Top of the axis: the next round number above the peak, even so the middle line is a whole number too. */
function niceMax(value: number): number {
  const top = Math.max(value, 2);
  const power = 10 ** Math.floor(Math.log10(top));
  return (NICE_STEPS.find((step) => step * power >= top) ?? 10) * power;
}

const EDGE_SHARE = 0.15;

/** One series of columns, e.g. plays per day. Hover or arrow keys show a column's value; the peak is labelled. */
export function ColumnsChart({ bars, label, formatValue, keyboardHint, plotHeight = 240, className }: ColumnsChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...bars.map((bar) => bar.value)));
  const ticks = [0, max / 2, max];
  const pct = (value: number) => `${(value / max) * 100}%`;
  const peak = bars.reduce((best, bar, index) => (bar.value > bars[best].value ? index : best), 0);
  const shown = active === null ? null : bars[active];

  const move = (index: number) => setActive(Math.min(Math.max(index, 0), bars.length - 1));
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? bars.length - 1;
    if (event.key === 'ArrowLeft') move(current - 1);
    else if (event.key === 'ArrowRight') move(current + 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(bars.length - 1);
    else if (event.key === 'Escape') setActive(null);
    else return;
    event.preventDefault();
  };

  let edge: string | undefined;
  if (active !== null && active < bars.length * EDGE_SHARE) edge = 'is-start';
  if (active !== null && active >= bars.length * (1 - EDGE_SHARE)) edge = 'is-end';

  return (
    <figure className={cx('ax-cols', className)} style={{ gridTemplateRows: `${plotHeight}px auto` }}>
      <div className="ax-cols__axis" aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} style={{ bottom: pct(tick) }}>
            {formatValue(tick)}
          </span>
        ))}
      </div>
      <div
        className="ax-cols__plot"
        tabIndex={0}
        role="group"
        aria-label={label}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((current) => current ?? bars.length - 1)}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <div className="ax-cols__grid" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ bottom: pct(tick) }} />
          ))}
        </div>
        <div className="ax-cols__bars" aria-hidden="true">
          {bars.map((bar, index) => (
            <div key={bar.key} className={cx('ax-cols__slot', index === active && 'is-active')} onPointerEnter={() => setActive(index)}>
              <span className="ax-cols__bar" style={{ height: pct(bar.value) }} />
              {index === peak && active === null && bar.value > 0 ? (
                <span className="ax-cols__peak" style={{ bottom: pct(bar.value) }}>
                  {formatValue(bar.value)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
        {shown && active !== null ? (
          <div className={cx('ax-cols__tip', edge)} style={{ left: `${((active + 0.5) / bars.length) * 100}%`, bottom: pct(shown.value) }} aria-hidden="true">
            <strong>
              {shown.tip.value}
              {shown.tip.unit ? <span> {shown.tip.unit}</span> : null}
            </strong>
            <span>{shown.tip.caption}</span>
          </div>
        ) : null}
      </div>
      <div className="ax-cols__x" aria-hidden="true">
        {bars.map((bar) => (
          <span key={bar.key} className={cx(bar.tick && 'is-tick', bar.tick === 'major' && 'is-tick-2')}>
            {bar.label}
          </span>
        ))}
      </div>
      <p className="ax-sr" aria-live="polite">
        {shown ? `${shown.tip.caption}: ${shown.tip.value}${shown.tip.unit ? ` ${shown.tip.unit}` : ''}` : keyboardHint}
      </p>
    </figure>
  );
}
