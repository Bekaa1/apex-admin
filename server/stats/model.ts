import { launchedForStats, statsDateRanges, type DatedCampaign, type DatedPlays, type ReportFilters, type Range } from '../../src/cabinet/stats/reportSelection.ts';
import { todayInAlmaty } from '../../src/lib/dates.ts';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ReportError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 503) { super(code); this.name = 'ReportError'; this.code = code; this.status = status; }
}
export interface Campaign extends DatedCampaign { ad_id: string; title: string | null; name: string | null; spent_budget: number | null; price_per_play: number | null }
export interface CampaignMetric { ref: string; name: string; status: string; startDate: string | null; plays: number; previousPlays: number | null; spent: number | null; price: number | null }
export interface ReportSnapshot {
  generatedAt: string; filters: ReportFilters; range: Range; compare: Range | null; estimatedSpend: boolean;
  totals: { plays: number; previousPlays: number | null; spent: number | null; price: number | null };
  campaigns: CampaignMetric[];
}
export function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
export function parseFilters(value: unknown): ReportFilters {
  if (!object(value) || Object.keys(value).some(key => !['campaignId', 'period', 'scope', 'language'].includes(key))
    || !(value.campaignId === null || typeof value.campaignId === 'string' && UUID.test(value.campaignId))
    || typeof value.period !== 'string' || !['7d', '30d', '90d', 'all'].includes(value.period)
    || typeof value.scope !== 'string' || !['all', 'running', 'finished'].includes(value.scope)
    || typeof value.language !== 'string' || !['ru', 'kk', 'en'].includes(value.language)) throw new ReportError('invalid_request', 400);
  return value as unknown as ReportFilters;
}
const amount = (v: unknown) => v === null || typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER;
const nullableString = (v: unknown) => v === null || typeof v === 'string';
const timestamp = (v: unknown) => v === null || typeof v === 'string' && Number.isFinite(Date.parse(v));
export function parseCampaigns(data: unknown): Campaign[] {
  if (!Array.isArray(data) || !data.every(row => object(row) && typeof row.ad_id === 'string' && UUID.test(row.ad_id)
    && ['title', 'name', 'status'].every(key => nullableString(row[key])) && timestamp(row.start_date) && timestamp(row.end_date)
    && amount(row.spent_budget) && amount(row.price_per_play)) || new Set(data.map(row => row.ad_id)).size !== data.length) throw new ReportError('invalid_data');
  return data;
}
export function parsePlays(data: unknown): DatedPlays[] {
  if (!Array.isArray(data) || !data.every(row => object(row) && typeof row.ad_id === 'string' && UUID.test(row.ad_id)
    && typeof row.play_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.play_date)
    && Number.isFinite(Date.parse(row.play_date)) && new Date(row.play_date).toISOString().slice(0, 10) === row.play_date
    && Number.isSafeInteger(row.plays) && Number(row.plays) >= 0)
    || new Set(data.map(row => `${row.ad_id}:${row.play_date}`)).size !== data.length) throw new ReportError('invalid_data');
  return data;
}
export function chooseCampaigns(rows: Campaign[], filters: ReportFilters): Campaign[] {
  const launched = rows.filter(launchedForStats);
  if (filters.campaignId) {
    const chosen = launched.find(row => row.ad_id === filters.campaignId);
    if (!chosen) throw new ReportError('campaign_unavailable', 404);
    return [chosen];
  }
  return launched.filter(row => filters.scope === 'all' || (row.status === 'completed') === (filters.scope === 'finished'));
}
export function buildSnapshot(rows: Campaign[], plays: DatedPlays[], filters: ReportFilters, now = new Date()): ReportSnapshot {
  const chosen = chooseCampaigns(rows, filters);
  if (!chosen.length) throw new ReportError('no_data', 422);
  if (chosen.length > 200) throw new ReportError('too_large', 413);
  const { range, compare } = statsDateRanges(chosen, plays, filters.period, todayInAlmaty(now));
  const byCampaign = (dates: Range) => {
    const counts = new Map<string, number>();
    for (const row of plays) if (row.ad_id && row.play_date && row.play_date >= dates.from && row.play_date <= dates.to) {
      counts.set(row.ad_id, (counts.get(row.ad_id) ?? 0) + (row.plays ?? 0));
    }
    return counts;
  };
  const current = byCampaign(range), previous = compare ? byCampaign(compare) : null;
  const campaigns = chosen.sort((a, b) => (current.get(b.ad_id) ?? 0) - (current.get(a.ad_id) ?? 0) || a.ad_id.localeCompare(b.ad_id)).map((row, i) => {
    const count = current.get(row.ad_id) ?? 0;
    const spent = filters.period === 'all' ? row.spent_budget : row.price_per_play === null ? null : count * row.price_per_play;
    const name = Array.from(row.title || row.name || '—').map(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char).join('').slice(0, 500);
    return { ref: `C${i + 1}`, name, status: row.status ?? '—', startDate: row.start_date, plays: count,
      previousPlays: previous ? previous.get(row.ad_id) ?? 0 : null, spent, price: spent === null || !count ? null : spent / count };
  });
  const totalPlays = campaigns.reduce((n, row) => n + row.plays, 0);
  if (!totalPlays) throw new ReportError('no_data', 422);
  const spent = campaigns.some(row => row.spent === null) ? null : campaigns.reduce((n, row) => n + row.spent!, 0);
  const previousPlays = compare ? campaigns.reduce((n, row) => n + row.previousPlays!, 0) : null;
  if (!Number.isSafeInteger(totalPlays) || previousPlays !== null && !Number.isSafeInteger(previousPlays)
    || spent !== null && (!Number.isFinite(spent) || spent > Number.MAX_SAFE_INTEGER)) throw new ReportError('invalid_data');
  return { generatedAt: now.toISOString(), filters, range, compare, estimatedSpend: filters.period !== 'all', campaigns,
    totals: { plays: totalPlays, previousPlays, spent, price: spent === null ? null : spent / totalPlays } };
}
