import type { Database } from '../../lib/database.types';

export const STORE_LIST = '/admin/stores';
export const PAGE_SIZE = 25;
export const FILTER_LIMIT = 256;
export type StoreRow = Pick<Database['public']['Tables']['stores']['Row'], 'id' | 'name' | 'city' | 'address' | 'partner_id' | 'timezone' | 'created_at'>;
export type StoreItem = StoreRow & { partnerName: string | null };
export interface StoreFilters { search: string; city: string }
export interface StoreSelection { filters: StoreFilters; page: number; error: 'filters' | 'page' | null }
export interface StorePage { rows: StoreItem[]; count: number | null; hasNext: boolean; partnersUnavailable: boolean }

export function isStoreId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Only validated Apex store IDs are used in administrative card URLs. */
export function storeDetailPath(id: string): string {
  if (!isStoreId(id)) throw new Error('Invalid store ID');
  return `${STORE_LIST}/${id.toLowerCase()}`;
}

export function validFilters(filters: StoreFilters): boolean {
  return [filters.search, filters.city].every(value => value.length <= FILTER_LIMIT
    && !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127));
}

export function readSelection(params: URLSearchParams): StoreSelection {
  const filters = { search: params.get('search') ?? '', city: params.get('city') ?? '' };
  const raw = params.get('page') ?? '1';
  const page = Number(raw);
  const badPage = !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(page)
    || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) || params.getAll('page').length > 1;
  const badFilters = !validFilters(filters) || ['search', 'city'].some(key => params.getAll(key).length > 1);
  return { filters, page: badPage ? 1 : page, error: badPage ? 'page' : badFilters ? 'filters' : null };
}

export function selectionParams(previous: URLSearchParams, filters: StoreFilters, page: number) {
  const params = new URLSearchParams(previous);
  for (const key of ['search', 'city', 'page']) params.delete(key);
  if (filters.search !== '') params.set('search', filters.search);
  if (filters.city !== '') params.set('city', filters.city);
  params.set('page', String(page));
  return params;
}

/** Literal substring regexp, passed as a single fixed-column PostgREST parameter. */
export function storeNamePattern(search: string): string {
  return search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isStoreRow(value: unknown): value is StoreRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return isStoreId(row.id) && typeof row.name === 'string'
    && (row.partner_id === null || isStoreId(row.partner_id))
    && ['city', 'address', 'timezone', 'created_at'].every(key => row[key] === null || typeof row[key] === 'string');
}
