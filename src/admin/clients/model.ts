import type { Database } from '../../lib/database.types';

export const CLIENT_PAGE_SIZE = 25;
export const FILTER_LIMIT = 256;
type User = Database['public']['Tables']['users']['Row'];
export type ClientRow = Pick<User, 'id' | 'full_name' | 'display_name' | 'company_name' | 'bin' | 'email' | 'phone' | 'created_at'> & { display_id: number | null };
export interface ClientFilters { search: string; displayId: string }
export type ClientFilterError = 'number' | 'filters' | 'page';
export interface ClientSelection { filters: ClientFilters; page: number; error: ClientFilterError | null }
export interface ClientPageData { rows: ClientRow[]; count: number | null; hasNext: boolean }

export function isClientId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function displayNumber(value: string): number | null | undefined {
  const number = value.trim();
  if (number === '') return null;
  if (!/^\d+$/.test(number) || !Number.isSafeInteger(Number(number))) return undefined;
  return Number(number);
}
export function clientFilterError(filters: ClientFilters): ClientFilterError | null {
  if ([filters.search, filters.displayId].some(value => value.length > FILTER_LIMIT
    || Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) return 'filters';
  return displayNumber(filters.displayId) === undefined ? 'number' : null;
}
export function readClientSelection(params: URLSearchParams): ClientSelection {
  const filters = { search: params.get('search') ?? '', displayId: params.get('display_id') ?? '' };
  const raw = params.get('page') ?? '1';
  const page = Number(raw);
  const badPage = !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(page) || page > Math.floor(Number.MAX_SAFE_INTEGER / CLIENT_PAGE_SIZE) || params.getAll('page').length > 1;
  const duplicates = ['search', 'display_id'].some(key => params.getAll(key).length > 1);
  return { filters, page: badPage ? 1 : page, error: badPage ? 'page' : duplicates ? 'filters' : clientFilterError(filters) };
}
export function clientParams(previous: URLSearchParams, filters: ClientFilters, page: number): URLSearchParams {
  const params = new URLSearchParams(previous);
  ['search', 'display_id', 'page'].forEach(key => params.delete(key));
  if (filters.search !== '') params.set('search', filters.search);
  if (filters.displayId !== '') params.set('display_id', filters.displayId);
  params.set('page', String(page));
  return params;
}
/** Same literal imatch/quoted-value escaping as the corporate request search.
 * Only fixed columns/operators. User text cannot introduce another OR condition.
 */
export function clientSearchFilter(search: string): string {
  const literal = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoted = '"' + literal.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  return ['full_name', 'display_name', 'company_name', 'email'].map(column => `${column}.imatch.${quoted}`).join(',');
}
export function isClientRow(value: unknown): value is ClientRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return isClientId(row.id)
    && (row.display_id === null || typeof row.display_id === 'number' && Number.isSafeInteger(row.display_id))
    && ['full_name', 'display_name', 'company_name', 'bin', 'email', 'phone', 'created_at'].every(key => row[key] === null || typeof row[key] === 'string');
}
export function clientName(row: ClientRow, fallback: string): string {
  return row.full_name?.trim() || row.display_name?.trim() || fallback;
}
