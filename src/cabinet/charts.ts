// Play charts shared by the campaign card and «Статистика».
import type { ColumnsChartBar, DeltaTone, DeltaTrend } from '../design-system';
import type { Lang } from '../i18n/i18n';
import { formatDayMonth, formatDayRange, formatMonthShort, formatMonthYear, formatNumber } from '../lib/format';

export type ChartStep = 'day' | 'week' | 'month';

/** Plays in one column: a day, a week or a month (YYYY-MM-DD, both ends included). */
export interface PlaysBucket {
  from: string;
  to: string;
  plays: number;
  /** The period covers only part of the week or month: the column is hatched and left out of the average. */
  partial?: boolean;
}

/** About eight labels along the axis: minor every k-th column, major (kept on narrow charts) every 2k-th. */
function tickOf(index: number, count: number): ColumnsChartBar['tick'] {
  const every = Math.max(1, Math.round(count / 8));
  if (index % (2 * every) === 0) return 'major';
  return index % every === 0 ? 'minor' : undefined;
}

/** «19 сент.», «21 сент. — 27 сент.» or «сентябрь 2026 г.». */
export function bucketCaption(bucket: PlaysBucket, step: ChartStep, lang: Lang): string {
  if (step === 'month') return formatMonthYear(bucket.from, lang);
  return bucket.from === bucket.to ? formatDayMonth(bucket.from, lang) : formatDayRange(bucket.from, bucket.to, lang);
}

/** Columns of `ColumnsChart`; a day column names its month on the first labelled day of that month. */
export function playsChartBars(buckets: PlaysBucket[], step: ChartStep, lang: Lang, unit: (plays: number) => string): ColumnsChartBar[] {
  let labelledMonth = '';
  return buckets.map((bucket, index) => {
    const tick = tickOf(index, buckets.length);
    let label = formatDayMonth(bucket.from, lang);
    if (step === 'month') label = formatMonthShort(bucket.from, lang);
    else if (step === 'day') {
      const month = bucket.from.slice(0, 7);
      const withMonth = tick !== undefined && month !== labelledMonth;
      if (withMonth) labelledMonth = month;
      else label = String(Number(bucket.from.slice(8)));
    }
    return {
      key: bucket.from,
      value: bucket.plays,
      label,
      tick,
      muted: bucket.partial,
      tip: { value: formatNumber(bucket.plays, lang), unit: unit(bucket.plays), caption: bucketCaption(bucket, step, lang) },
    };
  });
}

// The tone and the arrow follow the rounded percent, so «0 %» never looks like a drop.
const roundedPct = (delta: number) => Math.round(delta * 100);

/** Green for growth, red for a drop; `inverse` when less is better, e.g. the price of a play. */
export function deltaTone(delta: number, inverse = false): DeltaTone {
  const pct = roundedPct(delta);
  if (pct === 0) return 'neutral';
  return pct > 0 !== inverse ? 'success' : 'danger';
}

export function deltaTrend(delta: number): DeltaTrend {
  const pct = roundedPct(delta);
  if (pct === 0) return 'flat';
  return pct > 0 ? 'up' : 'down';
}
