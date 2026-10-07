import { eachDay, endOfMonth, shiftDate, startOfMonth, startOfWeek } from '../../lib/dates';
import type { ChartStep, PlaysBucket } from '../charts';
import type { DateRange, StatsChart } from './types';

/** Columns of the chart: days, weeks from Monday or calendar months. A week or month the dates cut is partial. */
export function chartBuckets(perDay: ReadonlyMap<string, number>, range: DateRange, step: ChartStep): PlaysBucket[] {
  const buckets: PlaysBucket[] = [];
  for (const day of eachDay(range.from, range.to)) {
    const plays = perDay.get(day) ?? 0;
    const last = buckets.at(-1);
    if (step !== 'day' && last && day <= last.to) {
      last.plays += plays;
      continue;
    }
    if (step === 'day') {
      buckets.push({ from: day, to: day, plays });
      continue;
    }
    const start = step === 'week' ? startOfWeek(day) : startOfMonth(day);
    const end = step === 'week' ? shiftDate(start, 6) : endOfMonth(day);
    const to = end < range.to ? end : range.to;
    buckets.push({ from: day, to, plays, partial: day !== start || to !== end });
  }
  return buckets;
}

/** The chart with its caption numbers: the average and the peak leave partial columns out. */
export function buildChart(perDay: ReadonlyMap<string, number>, range: DateRange, step: ChartStep): StatsChart {
  const buckets = chartBuckets(perDay, range, step);
  const full = buckets.filter((bucket) => !bucket.partial);
  const peak = (full.length ? full : buckets).reduce<PlaysBucket | null>((best, bucket) => (!best || bucket.plays > best.plays ? bucket : best), null);
  return {
    step,
    buckets,
    average: full.length ? full.reduce((sum, bucket) => sum + bucket.plays, 0) / full.length : null,
    peak: peak && peak.plays > 0 ? peak : null,
    hasPartial: buckets.length !== full.length,
  };
}
