import type { Database } from '../../lib/database.types';

export const PAGE_SIZE = 25;
export const BOOLEAN_FIELDS = ['can_select_store', 'can_select_zone', 'has_sound', 'exclusive_zone', 'more_plays'] as const;
export type TariffRow = Omit<Database['public']['Tables']['tariffs']['Row'], 'created_at'>;
export type BooleanFilter = 'all' | 'true' | 'false';
export interface TariffFilters { archived: BooleanFilter; purchasable: BooleanFilter }
export interface TariffSelection { filters: TariffFilters; page: number; error: boolean }
export interface TariffPage { rows: TariffRow[]; count: number | null; hasNext: boolean }

export function validFilters(filters: TariffFilters): boolean {
  return [filters.archived, filters.purchasable].every(value => ['all', 'true', 'false'].includes(value));
}
export function validPage(page: number): boolean {
  return Number.isSafeInteger(page) && page >= 1 && page <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE);
}
export function readSelection(params: URLSearchParams): TariffSelection {
  const archived = params.get('archived') ?? 'false';
  const purchasable = params.get('purchasable') ?? 'all';
  const filters = { archived, purchasable } as TariffFilters;
  const raw = params.get('page') ?? '1';
  const page = Number(raw);
  return { filters, page: validPage(page) ? page : 1,
    error: !validFilters(filters) || !/^[1-9]\d*$/.test(raw) || !validPage(page)
      || ['archived', 'purchasable', 'page'].some(key => params.getAll(key).length > 1) };
}
export function selectionParams(previous: URLSearchParams, filters: TariffFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams(previous);
  params.set('archived', filters.archived);
  params.set('purchasable', filters.purchasable);
  params.set('page', String(page));
  return params;
}
export function isTariffRow(value: unknown): value is TariffRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && row.id.trim() !== '' && typeof row.name === 'string' && typeof row.updated_at === 'string'
    && ['code', 'badge'].every(key => row[key] === null || typeof row[key] === 'string')
    && ['price_per_play', 'min_amount', 'version', 'sort_order'].every(key => typeof row[key] === 'number' && Number.isFinite(row[key]))
    && [...BOOLEAN_FIELDS, 'purchasable', 'is_archived'].every(key => typeof row[key] === 'boolean');
}
export function matchesFilters(row: TariffRow, filters: TariffFilters): boolean {
  return (filters.archived === 'all' || row.is_archived === (filters.archived === 'true'))
    && (filters.purchasable === 'all' || row.purchasable === (filters.purchasable === 'true'));
}
