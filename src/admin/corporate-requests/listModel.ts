import type { Database } from '../../lib/database.types';

export const CORPORATE_PAGE_SIZE = 25;
export const FILTER_MAX_LENGTH = 256;
export type CorporateListRow = Pick<Database['public']['Tables']['corporate_requests']['Row'],
  'id' | 'company' | 'contact_name' | 'phone' | 'email' | 'status' | 'created_at' | 'message'>;
export interface CorporateFilters { search: string; status: string }
export interface CorporateSelection { filters: CorporateFilters; page: number; error: 'page' | 'filters' | null }
export interface CorporatePageData { rows: CorporateListRow[]; count: number }

export function validCorporateFilters(filters: CorporateFilters): boolean {
  return [filters.search, filters.status].every((value) => value.length <= FILTER_MAX_LENGTH
    && !Array.from(value).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127));
}

export function readCorporateSelection(params: URLSearchParams): CorporateSelection {
  const filters = { search: params.get('search') ?? '', status: params.get('status') ?? '' };
  const rawPage = params.get('page') ?? '1';
  const page = Number(rawPage);
  const invalidPage = !/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(page)
    || page > Math.floor(Number.MAX_SAFE_INTEGER / CORPORATE_PAGE_SIZE) || params.getAll('page').length > 1;
  const invalidFilters = !validCorporateFilters(filters) || ['search', 'status'].some((key) => params.getAll(key).length > 1);
  return { filters, page: invalidPage ? 1 : page, error: invalidPage ? 'page' : invalidFilters ? 'filters' : null };
}

export function corporateListParams(previous: URLSearchParams, filters: CorporateFilters, page: number): URLSearchParams {
  const next = new URLSearchParams(previous);
  ['search', 'status', 'page'].forEach((key) => next.delete(key));
  if (filters.search !== '') next.set('search', filters.search);
  if (filters.status !== '') next.set('status', filters.status);
  next.set('page', String(page));
  return next;
}

/** PostgREST imatch: escape the regexp first, then its quoted filter value.
 * Fixed field names/operators only. Unlike ilike, imatch does not turn * into %.
 * URL encoding is handled once by supabase-js, not manually here.
 */
export function corporateSearchFilter(search: string): string {
  const literalPattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoted = '"' + literalPattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  return `company.imatch.${quoted},contact_name.imatch.${quoted}`;
}

export function isCorporateListRow(value: unknown): value is CorporateListRow {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return ['id', 'company', 'phone', 'status', 'created_at'].every((key) => typeof row[key] === 'string')
    && ['contact_name', 'email', 'message'].every((key) => row[key] === null || typeof row[key] === 'string');
}

export function messagePreview(message: string | null, empty: string): string {
  const value = message?.replace(/\s+/g, ' ').trim();
  if (!value) return empty;
  // Read at most 161 code points after normalising whitespace; do not split emoji.
  const points: string[] = [];
  for (const char of value) { points.push(char); if (points.length > 160) break; }
  return points.length > 160 ? points.slice(0, 160).join('') + '…' : value;
}
