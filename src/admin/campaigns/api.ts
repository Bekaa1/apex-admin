import { requireSupabase } from '../../lib/supabase';
import { campaignSearchFilter, isCampaignId, isCampaignRow, PAGE_SIZE, validFilters, type CampaignMode, type CampaignPage, type CampaignSelection } from './model';

export type CampaignErrorKind = 'denied' | 'missing' | 'invalid' | 'unavailable';
export class CampaignReadError extends Error {
  readonly kind: CampaignErrorKind;
  constructor(kind: CampaignErrorKind) { super('Administrative campaign read failed'); this.name = 'CampaignReadError'; this.kind = kind; }
}
type Lookup = { labels: Map<string, string>; unavailable: boolean };

/** If count is omitted, check one further ID instead of guessing the last page.
 * Also catches a server row cap smaller than 25 before offset pagination skips records.
 */
async function hasFollowingRow(selection: CampaignSelection, offset: number, signal: AbortSignal, mode: CampaignMode, clientId?: string): Promise<boolean> {
  let request = requireSupabase().from('ads').select('id');
  if (clientId !== undefined) request = request.eq('user_id', clientId);
  if (selection.filters.search !== '') request = request.or(campaignSearchFilter(selection.filters.search));
  if (selection.filters.status !== '') request = request.filter('status', 'eq', selection.filters.status);
  const { data, error } = await request.order('created_at', { ascending: mode === 'moderation', nullsFirst: false }).order('id', { ascending: mode === 'moderation' })
    .range(offset, offset).abortSignal(signal);
  if (error?.code === 'PGRST103') return false;
  if (error) throw new CampaignReadError('unavailable');
  if (!Array.isArray(data) || data.length > 1 || !data.every((row) => row !== null && typeof row === 'object' && isCampaignId(row.id))) throw new CampaignReadError('invalid');
  return data.length === 1;
}

/** Two bounded, independent lookups per page, never an implicit users join or N+1. */
async function profiles(ids: string[], signal: AbortSignal): Promise<Lookup> {
  const labels = new Map<string, string>();
  if (!ids.length) return { labels, unavailable: false };
  try {
    const { data, error } = await requireSupabase().from('users').select('id,company_name,full_name,display_name').in('id', ids).limit(PAGE_SIZE).abortSignal(signal);
    if (error || !Array.isArray(data)) return { labels, unavailable: true };
    for (const row of data) {
      if (!ids.includes(row.id)) continue;
      const name = [row.company_name, row.full_name, row.display_name].find((value) => typeof value === 'string' && value.trim());
      if (name) labels.set(row.id, name);
    }
    return { labels, unavailable: ids.some((id) => !data.some((row) => row.id === id)) };
  } catch { return { labels, unavailable: true }; }
}
async function tariffs(ids: string[], signal: AbortSignal): Promise<Lookup> {
  const labels = new Map<string, string>();
  if (!ids.length) return { labels, unavailable: false };
  try {
    // ads_tariff_id_fkey -> tariffs.id is present in database.types.ts. Include archived versions.
    const { data, error } = await requireSupabase().from('tariffs').select('id,name,code').in('id', ids).limit(PAGE_SIZE).abortSignal(signal);
    if (error || !Array.isArray(data)) return { labels, unavailable: true };
    for (const row of data) {
      if (!ids.includes(row.id)) continue;
      const name = [row.name, row.code].find((value) => typeof value === 'string' && value.trim());
      if (name) labels.set(row.id, name);
    }
    return { labels, unavailable: ids.some((id) => !labels.has(id)) };
  } catch { return { labels, unavailable: true }; }
}

/** All advertiser campaigns visible to the administrator's JWT/RLS. No my_* source or mutations. */
export async function fetchCampaignPage(selection: CampaignSelection, signal: AbortSignal, mode: CampaignMode = 'all', clientId?: string): Promise<CampaignPage> {
  if (clientId !== undefined && !isCampaignId(clientId)) throw new CampaignReadError('invalid');
  // Enforce the queue at the data boundary, regardless of supplied URL filters.
  if (mode === 'moderation') selection = { ...selection, filters: { ...selection.filters, status: 'pending' } };
  const { filters, page } = selection;
  if (selection.error || !validFilters(filters) || !Number.isSafeInteger(page) || page < 1 || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE)) throw new CampaignReadError('invalid');
  try {
    let request = requireSupabase().from('ads')
      .select('id,display_id,title,name,user_id,status,tariff_id,budget,paid_amount,spent_budget,created_at', { count: 'exact' });
    if (clientId !== undefined) request = request.eq('user_id', clientId);
    if (filters.search !== '') request = request.or(campaignSearchFilter(filters.search));
    // Keep unknown/new server values usable; do not invent transitions or hide deleted campaigns.
    if (filters.status !== '') request = request.filter('status', 'eq', filters.status);
    const offset = (page - 1) * PAGE_SIZE;
    const { data, error, status, count } = await request.order('created_at', { ascending: mode === 'moderation', nullsFirst: false })
      .order('id', { ascending: mode === 'moderation' }).range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
    if (offset > 0 && status === 416 && error?.code === 'PGRST103') return { rows: [], count: null, hasNext: false, profilesUnavailable: false, tariffsUnavailable: false };
    if (error) throw new CampaignReadError(status === 401 || status === 403 || error.code === '42501' ? 'denied'
      : ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code) ? 'missing' : 'unavailable');
    if (!Array.isArray(data) || !data.every(isCampaignRow) || clientId !== undefined && data.some(row => row.user_id?.toLowerCase() !== clientId.toLowerCase()) || data.length > PAGE_SIZE || new Set(data.map((row) => row.id)).size !== data.length
      || count !== null && (!Number.isSafeInteger(count) || count < 0 || data.length !== Math.min(PAGE_SIZE, Math.max(0, count - offset)))) throw new CampaignReadError('invalid');
    const userIds = [...new Set(data.flatMap((row) => row.user_id ? [row.user_id] : []))];
    const tariffIds = [...new Set(data.flatMap((row) => row.tariff_id ? [row.tariff_id] : []))];
    const [users, plans, hasNext] = await Promise.all([
      profiles(userIds, signal), tariffs(tariffIds, signal),
      count === null ? hasFollowingRow(selection, offset + data.length, signal, mode, clientId) : Promise.resolve(offset + data.length < count),
    ]);
    if (count === null && data.length < PAGE_SIZE && hasNext) throw new CampaignReadError('invalid');
    signal.throwIfAborted();
    return {
      rows: data.map((row) => ({ ...row, advertiser: row.user_id ? users.labels.get(row.user_id) ?? null : null, tariffName: row.tariff_id ? plans.labels.get(row.tariff_id) ?? null : null })),
      count, hasNext,
      profilesUnavailable: users.unavailable, tariffsUnavailable: plans.unavailable,
    };
  } catch (error) {
    if (error instanceof CampaignReadError) throw error;
    // Never retain/log raw backend errors or campaign/profile responses.
    throw new CampaignReadError('unavailable');
  }
}
