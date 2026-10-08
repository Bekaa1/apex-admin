import { requireSupabase } from '../../lib/supabase';
import { CORPORATE_PAGE_SIZE, corporateSearchFilter, isCorporateListRow, validCorporateFilters, type CorporatePageData, type CorporateSelection } from './listModel';

export type CorporateListErrorKind = 'denied' | 'missing' | 'invalid' | 'unavailable';
export class CorporateListReadError extends Error {
  readonly kind: CorporateListErrorKind;
  constructor(kind: CorporateListErrorKind) { super('Corporate request list read failed'); this.kind = kind; this.name = 'CorporateListReadError'; }
}

/** One server page only. No user_id requirement: anonymous requests are valid records. */
export async function fetchCorporatePage(selection: CorporateSelection, signal: AbortSignal): Promise<CorporatePageData> {
  const { filters, page } = selection;
  if (selection.error || !validCorporateFilters(filters) || !Number.isSafeInteger(page) || page < 1
    || page > Math.floor(Number.MAX_SAFE_INTEGER / CORPORATE_PAGE_SIZE)) throw new CorporateListReadError('invalid');
  try {
    let request = requireSupabase().from('corporate_requests')
      .select('id,company,contact_name,phone,email,status,created_at,message', { count: 'exact' });
    if (filters.search !== '') request = request.or(corporateSearchFilter(filters.search));
    // Exact equality via a separate query parameter, never raw filter interpolation.
    if (filters.status !== '') request = request.eq('status', filters.status);
    const offset = (page - 1) * CORPORATE_PAGE_SIZE;
    const { data, error, status, count } = await request
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + CORPORATE_PAGE_SIZE - 1).abortSignal(signal);
    if (error) throw new CorporateListReadError(status === 401 || status === 403 || error.code === '42501' ? 'denied'
      : error.code === '42P01' || error.code === 'PGRST205' ? 'missing' : 'unavailable');
    // A missing count or unexpectedly truncated page must not silently skip records.
    if (count === null || !Number.isSafeInteger(count) || count < 0 || !Array.isArray(data)
      || data.length !== Math.min(CORPORATE_PAGE_SIZE, Math.max(0, count - offset))
      || !data.every(isCorporateListRow) || new Set(data.map((row) => row.id)).size !== data.length) throw new CorporateListReadError('invalid');
    return { rows: data, count };
  } catch (error) {
    if (error instanceof CorporateListReadError) throw error;
    // Do not retain or log raw responses, contacts, or request messages.
    throw new CorporateListReadError('unavailable');
  }
}
