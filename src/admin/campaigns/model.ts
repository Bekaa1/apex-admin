import { Constants, type Database } from '../../lib/database.types';
import { STATUS_TONE, statusLabelKey, type VisibleStatus } from '../../cabinet/campaignStatus';
import type { BadgeTone } from '../../design-system';

export const CAMPAIGN_LIST = '/admin/campaigns';
export const MODERATION_LIST = '/admin/moderation';
export type CampaignMode = 'all' | 'moderation';
export const PAGE_SIZE = 25;
export const FILTER_LIMIT = 256;
export const CAMPAIGN_STATUSES = Constants.public.Enums.ad_status;
type Ad = Database['public']['Tables']['ads']['Row'];
export type CampaignRow = Pick<Ad, 'id' | 'title' | 'name' | 'user_id' | 'tariff_id' | 'created_at'> & {
  display_id: number | null;
  status: string | null;
  budget: number | null;
  paid_amount: number | null;
  spent_budget: number | null;
};
export type CampaignItem = CampaignRow & { advertiser: string | null; tariffName: string | null };
export interface CampaignFilters { search: string; status: string }
export interface CampaignSelection { filters: CampaignFilters; page: number; error: 'page' | 'filters' | null }
export interface CampaignPage { rows: CampaignItem[]; count: number | null; hasNext: boolean; profilesUnavailable: boolean; tariffsUnavailable: boolean }

export function isCampaignId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function validFilters(filters: CampaignFilters): boolean {
  return [filters.search, filters.status].every((value) => value.length <= FILTER_LIMIT
    && !Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127));
}
export function readSelection(params: URLSearchParams, mode: CampaignMode = 'all'): CampaignSelection {
  if (mode === 'moderation') {
    params = new URLSearchParams(params);
    params.set('status', 'pending');
  }
  const filters = { search: params.get('search') ?? '', status: params.get('status') ?? '' };
  const raw = params.get('page') ?? '1';
  const page = Number(raw);
  const invalidPage = !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(page) || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) || params.getAll('page').length > 1;
  const invalidFilters = !validFilters(filters) || ['search', 'status'].some((key) => params.getAll(key).length > 1);
  return { filters, page: invalidPage ? 1 : page, error: invalidPage ? 'page' : invalidFilters ? 'filters' : null };
}
export function selectionParams(previous: URLSearchParams, filters: CampaignFilters, page: number): URLSearchParams {
  const next = new URLSearchParams(previous);
  ['search', 'status', 'page'].forEach((key) => next.delete(key));
  if (filters.search !== '') next.set('search', filters.search);
  if (filters.status !== '') next.set('status', filters.status);
  next.set('page', String(page));
  return next;
}

/** Literal substring of title/name; optional exact numeric display_id. Fixed operators only.
 * Escape the PostgreSQL regexp, then the PostgREST quoted value. The SDK encodes the URL.
 */
export function campaignSearchFilter(search: string): string {
  const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoted = '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  const terms = [`title.imatch.${quoted}`, `name.imatch.${quoted}`];
  const number = search.trim().replace(/^#\s*/, '');
  if (/^\d+$/.test(number) && Number.isSafeInteger(Number(number))) terms.push(`display_id.eq.${Number(number)}`);
  return terms.join(',');
}
export function isCampaignRow(value: unknown): value is CampaignRow {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return isCampaignId(row.id)
    && ['title', 'name', 'status', 'created_at'].every((key) => row[key] === null || typeof row[key] === 'string')
    && ['user_id', 'tariff_id'].every((key) => row[key] === null || isCampaignId(row[key]))
    && (row.display_id === null || typeof row.display_id === 'number' && Number.isSafeInteger(row.display_id))
    && ['budget', 'paid_amount', 'spent_budget'].every((key) => row[key] === null || typeof row[key] === 'number' && Number.isFinite(row[key]));
}
export function campaignStatus(status: string | null): { key?: string; raw?: string; tone: BadgeTone } {
  if (status === null || status === '') return { key: 'adminCampaigns.noData', tone: 'neutral' };
  if (Object.hasOwn(STATUS_TONE, status)) return { key: statusLabelKey(status as VisibleStatus), tone: STATUS_TONE[status as VisibleStatus] };
  if (status === 'deleted') return { key: 'adminCampaigns.deleted', tone: 'neutral' };
  return { raw: status, tone: 'neutral' };
}
