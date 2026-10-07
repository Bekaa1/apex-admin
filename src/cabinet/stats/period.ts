import { daysBetween, shiftDate } from '../../lib/dates';
import type { ChartStep } from '../charts';
import type { DateRange, StatsPeriod } from './types';

export const STATS_PERIODS: StatsPeriod[] = ['7d', '30d', '90d', 'all'];

const PERIOD_DAYS: Record<Exclude<StatsPeriod, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 };

/** The chosen dates (Almaty, both ends included) and the previous period of the same length; «Всё время» is `lifetime`. */
export function periodRanges(period: StatsPeriod, today: string, lifetime: DateRange): { range: DateRange; compare: DateRange | null } {
  if (period === 'all') return { range: lifetime, compare: null };
  const days = PERIOD_DAYS[period];
  const from = shiftDate(today, -(days - 1));
  return { range: { from, to: today }, compare: { from: shiftDate(from, -days), to: shiftDate(from, -1) } };
}

/** As in the design: up to two months by days, up to a quarter by weeks, longer by months. */
export function defaultStep(range: DateRange): ChartStep {
  const days = daysBetween(range.from, range.to);
  if (days <= 62) return 'day';
  return days <= 92 ? 'week' : 'month';
}

export function inRange(day: string, range: DateRange): boolean {
  return day >= range.from && day <= range.to;
}
