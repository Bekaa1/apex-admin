import { requireSupabase } from '../../lib/supabase';
import { isStoreId, isStoreRow, PAGE_SIZE, storeNamePattern, validFilters, type StoreFilters, type StorePage, type StoreSelection } from './model';

export const STORE_COLUMNS = 'id,name,city,address,partner_id,timezone,created_at';

export type StoreErrorKind = 'denied' | 'missing' | 'invalid' | 'unavailable';
export class StoreReadError extends Error {
  readonly kind: StoreErrorKind;
  constructor(kind: StoreErrorKind) { super('Administrative store read failed'); this.name = 'StoreReadError'; this.kind = kind; }
}
export function responseError(error: { code?: string } | null, status: number) {
  if (error) throw new StoreReadError(status === 401 || status === 403 || error.code === '42501' ? 'denied'
    : ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? '') ? 'missing' : 'unavailable');
}

function pageQuery(filters: StoreFilters, count: boolean) {
  let request = requireSupabase().from('stores')
    .select(STORE_COLUMNS, count ? { count: 'exact' } : undefined);
  // A single parameter, not an interpolated OR expression. Regex metacharacters are literal.
  if (filters.search !== '') request = request.filter('name', 'imatch', storeNamePattern(filters.search));
  if (filters.city !== '') request = request.eq('city', filters.city);
  // Keep every returned row, including any record named «Все магазины».
  return request.order('name', { ascending: true, nullsFirst: false }).order('id', { ascending: true });
}

async function hasFollowingRow(filters: StoreFilters, offset: number, signal: AbortSignal): Promise<boolean> {
  const { data, error, status } = await pageQuery(filters, false).range(offset, offset).abortSignal(signal);
  if (status === 416 && error?.code === 'PGRST103') return false;
  responseError(error, status);
  if (!Array.isArray(data) || data.length > 1 || !data.every(isStoreRow)) throw new StoreReadError('invalid');
  return data.length === 1;
}

export async function fetchStorePartners(ids: string[], signal: AbortSignal) {
  if (ids.length > PAGE_SIZE || !ids.every(isStoreId)) throw new StoreReadError('invalid');
  const names = new Map<string, string>();
  if (!ids.length) return { names, unavailable: false };
  try {
    // stores_partner_id_fkey -> partners.id is present in database.types.ts.
    // At most 25 distinct IDs from the current page; no inner join can remove stores.
    const { data, error } = await requireSupabase().from('partners').select('id,name')
      .in('id', ids).limit(PAGE_SIZE).abortSignal(signal);
    if (error || !Array.isArray(data)) return { names, unavailable: true };
    for (const row of data) {
      if (!row || !isStoreId(row.id) || !ids.includes(row.id)) continue;
      if (typeof row.name === 'string' && row.name.trim()) names.set(row.id, row.name.trim());
    }
    // A successful but RLS-filtered response must still report unavailable names.
    return { names, unavailable: ids.some(id => !names.has(id)) };
  } catch { return { names, unavailable: true }; }
}

/** Direct registry under the admin session's JWT/RLS, not the advertising catalog RPC.
 * No equipment filters or name-based sentinel exclusion; server completeness remains a backend check.
 */
export async function fetchStorePage(selection: StoreSelection, signal: AbortSignal): Promise<StorePage> {
  const { filters, page } = selection;
  if (selection.error || !validFilters(filters) || !Number.isSafeInteger(page) || page < 1
    || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE)) throw new StoreReadError('invalid');
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const { data, error, status, count } = await pageQuery(filters, true).range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
    if (offset > 0 && status === 416 && error?.code === 'PGRST103') return { rows: [], count: null, hasNext: false, partnersUnavailable: false };
    responseError(error, status);
    if (!Array.isArray(data) || !data.every(isStoreRow) || data.length > PAGE_SIZE
      || new Set(data.map(row => row.id)).size !== data.length
      || count !== null && (!Number.isSafeInteger(count) || count < 0 || data.length !== Math.min(PAGE_SIZE, Math.max(0, count - offset)))) throw new StoreReadError('invalid');
    const partnerIds = [...new Set(data.flatMap(row => row.partner_id ? [row.partner_id] : []))];
    const [partners, hasNext] = await Promise.all([
      fetchStorePartners(partnerIds, signal),
      count === null ? hasFollowingRow(filters, offset + data.length, signal) : Promise.resolve(offset + data.length < count),
    ]);
    if (count === null && data.length < PAGE_SIZE && hasNext) throw new StoreReadError('invalid');
    signal.throwIfAborted();
    return { rows: data.map(row => ({ ...row, partnerName: row.partner_id ? partners.names.get(row.partner_id) ?? null : null })),
      count, hasNext, partnersUnavailable: partners.unavailable };
  } catch (error) {
    if (error instanceof StoreReadError) throw error;
    // No raw backend response, partner details or filter values in logs/errors.
    throw new StoreReadError('unavailable');
  }
}
