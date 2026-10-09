import { shiftDate, todayInAlmaty } from '../../lib/dates.ts';

export type ReportPeriod = '7d' | '30d' | '90d' | 'all';
export type ReportScope = 'all' | 'running' | 'finished';
export type ReportLanguage = 'ru' | 'kk' | 'en';
export interface ReportFilters { campaignId: string | null; period: ReportPeriod; scope: ReportScope; language: ReportLanguage }
export interface Range { from: string; to: string }
export interface DatedCampaign { ad_id: string | null; status: string | null; start_date: string | null; end_date: string | null }
export interface DatedPlays { ad_id: string | null; play_date: string | null; plays: number | null }

/** Same launched campaigns on screen and in the authenticated export. */
export function launchedForStats(row: DatedCampaign): boolean {
  return ['active', 'paused', 'hours_ended', 'budget_ended', 'completed'].includes(row.status ?? '')
    || row.status === 'pending' && Boolean(row.start_date);
}

/** Shared Almaty calendar boundaries. No clock, browser state or database access. */
export function statsDateRanges(rows: DatedCampaign[], plays: DatedPlays[], period: ReportPeriod, today: string): { range: Range; compare: Range | null } {
  if (period !== 'all') {
    const days = { '7d': 7, '30d': 30, '90d': 90 }[period];
    const from = shiftDate(today, 1 - days);
    return { range: { from, to: today }, compare: { from: shiftDate(from, -days), to: shiftDate(from, -1) } };
  }
  const ids = new Set(rows.map(row => row.ad_id));
  const playDays = plays.flatMap(row => row.ad_id && ids.has(row.ad_id) && row.play_date && (row.plays ?? 0) > 0 ? [row.play_date] : []);
  const starts = rows.flatMap(row => row.start_date ? [todayInAlmaty(new Date(row.start_date))] : []);
  const ends = rows.flatMap(row => row.end_date ? [todayInAlmaty(new Date(row.end_date))] : []);
  const from = [...starts, ...playDays].sort()[0] ?? today;
  const end = rows.length && rows.every(row => row.status === 'completed') ? [...ends, ...playDays].sort().at(-1) ?? today : today;
  return { range: { from, to: end < today ? end : today }, compare: null };
}
