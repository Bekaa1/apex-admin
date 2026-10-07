import { cx } from './cx';

export interface SparklineProps {
  /** A short series, e.g. plays per day; at least two values to draw a line. */
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

const INSET = 3;

/** Shape of a short series next to its number; decorative, the numbers are said elsewhere. The last point is marked. */
export function Sparkline({ values, width = 96, height = 28, className }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(...values) - min;
  const points = values.map((value, index) => {
    const x = INSET + (index * (width - 2 * INSET)) / (values.length - 1);
    const y = range > 0 ? INSET + (1 - (value - min) / range) * (height - 2 * INSET) : height / 2;
    return [x.toFixed(1), y.toFixed(1)];
  });
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg className={cx('ax-spark', className)} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <polyline points={points.map((point) => point.join(',')).join(' ')} />
      <circle cx={lastX} cy={lastY} r={3} />
    </svg>
  );
}
