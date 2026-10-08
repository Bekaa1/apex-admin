import type { HeatmapLevel } from '../../design-system';
import { eachDay, isoWeekday } from '../../lib/dates';
import type { DateRange, HeatmapData, HourPlays } from './types';

/** Hours the stores work, as drawn: 8:00–23:00. */
export const HEAT_HOURS = Array.from({ length: 16 }, (_, index) => index + 8);
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const LEVELS: HeatmapLevel[] = [0, 1, 2, 3, 4, 5];
const WINDOW = 3;

/** Average plays per weekday and hour over the dates: a slot's plays divided by how many such weekdays the dates have. */
export function buildHeatmap(rows: HourPlays[], range: DateRange): HeatmapData | null {
  const weekdays = new Map<number, number>();
  for (const day of eachDay(range.from, range.to)) weekdays.set(isoWeekday(day), (weekdays.get(isoWeekday(day)) ?? 0) + 1);
  const plays = new Map<string, number>();
  for (const row of rows) plays.set(`${row.weekday}:${row.hour}`, (plays.get(`${row.weekday}:${row.hour}`) ?? 0) + row.plays);
  const average = (weekday: number, hour: number) => (plays.get(`${weekday}:${hour}`) ?? 0) / (weekdays.get(weekday) ?? 1);

  const grid = WEEKDAYS.map((weekday) => ({ weekday, values: HEAT_HOURS.map((hour) => average(weekday, hour)) }));
  const max = Math.max(0, ...grid.flatMap((row) => row.values));
  if (max === 0) return null;
  const level = (value: number): HeatmapLevel => LEVELS[Math.min(5, Math.ceil((5 * value) / max))] ?? 0;

  const dayTotals = grid.map((row) => ({ weekday: row.weekday, total: row.values.reduce((sum, value) => sum + value, 0) }));
  const bestDays = [...dayTotals]
    .sort((a, b) => b.total - a.total)
    .slice(0, 2)
    .filter((day) => day.total > 0)
    .map((day) => day.weekday)
    .sort((a, b) => a - b);

  const hourTotals = HEAT_HOURS.map((_, index) => grid.reduce((sum, row) => sum + row.values[index], 0));
  let best: { from: number; total: number } | null = null;
  for (let index = 0; index + WINDOW <= HEAT_HOURS.length; index += 1) {
    const total = hourTotals.slice(index, index + WINDOW).reduce((sum, value) => sum + value, 0);
    if (!best || total > best.total) best = { from: HEAT_HOURS[index], total };
  }

  return {
    hours: HEAT_HOURS,
    rows: grid.map((row) => ({ weekday: row.weekday, cells: row.values.map((value, index) => ({ hour: HEAT_HOURS[index], average: value, level: level(value) })) })),
    bestDays,
    bestHours: best && best.total > 0 ? { from: best.from, to: best.from + WINDOW } : null,
  };
}
