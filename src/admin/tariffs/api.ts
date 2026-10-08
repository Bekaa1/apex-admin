import { requireSupabase } from '../../lib/supabase';
import { isTariffRow, matchesFilters, PAGE_SIZE, validFilters, validPage, type TariffFilters, type TariffPage, type TariffRow, type TariffSelection } from './model';

export type TariffErrorKind = 'denied' | 'missing' | 'invalid' | 'unavailable';
export class TariffReadError extends Error {
  readonly kind: TariffErrorKind;
  constructor(kind: TariffErrorKind) { super('Administrative tariff read failed'); this.name = 'TariffReadError'; this.kind = kind; }
}
function responseError(error: { code?: string } | null, status: number) {
  if (error) throw new TariffReadError(status === 401 || status === 403 || error.code === '42501' ? 'denied'
    : ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? '') ? 'missing' : 'unavailable');
}

function pageQuery(filters: TariffFilters, from: number, to: number, count: boolean, signal: AbortSignal) {
  let request = requireSupabase().from('tariffs').select(
    'id,name,code,price_per_play,min_amount,version,purchasable,is_archived,updated_at,can_select_store,can_select_zone,has_sound,exclusive_zone,more_plays,badge,sort_order',
    count ? { count: 'exact' } : undefined);
  if (filters.archived !== 'all') request = request.eq('is_archived', filters.archived === 'true');
  if (filters.purchasable !== 'all') request = request.eq('purchasable', filters.purchasable === 'true');
  return request.order('sort_order', { ascending: true, nullsFirst: false }).order('id', { ascending: true })
    .range(from, to).abortSignal(signal);
}

/** Current table conditions only; never alter historical invoices or budget portions. */
export async function fetchTariffs(selection: TariffSelection, signal: AbortSignal): Promise<TariffPage> {
  const { filters, page } = selection;
  if (selection.error || !validFilters(filters) || !validPage(page)) throw new TariffReadError('invalid');
  const offset = (page - 1) * PAGE_SIZE;
  const validRow = (row: unknown): row is TariffRow => isTariffRow(row) && matchesFilters(row, filters);
  try {
    const { data, count, error, status } = await pageQuery(filters, offset, offset + PAGE_SIZE - 1, true, signal);
    if (offset > 0 && status === 416 && error?.code === 'PGRST103') return { rows: [], count: null, hasNext: false };
    responseError(error, status);
    if (!Array.isArray(data) || !data.every(validRow) || data.length > PAGE_SIZE || new Set(data.map(row => row.id)).size !== data.length
      || count !== null && (!Number.isSafeInteger(count) || count < 0 || data.length !== Math.min(PAGE_SIZE, Math.max(0, count - offset)))) throw new TariffReadError('invalid');
    let hasNext = count !== null && offset + data.length < count;
    if (count === null) {
      const next = await pageQuery(filters, offset + data.length, offset + data.length, false, signal);
      if (!(next.status === 416 && next.error?.code === 'PGRST103')) {
        responseError(next.error, next.status);
        if (!Array.isArray(next.data) || next.data.length > 1 || !next.data.every(validRow)) throw new TariffReadError('invalid');
        hasNext = next.data.length === 1;
      }
      if (data.length < PAGE_SIZE && hasNext) throw new TariffReadError('invalid');
    }
    signal.throwIfAborted();
    return { rows: data, count, hasNext };
  } catch (error) {
    if (error instanceof TariffReadError) throw error;
    // No raw responses or record values in errors/logs.
    throw new TariffReadError('unavailable');
  }
}
