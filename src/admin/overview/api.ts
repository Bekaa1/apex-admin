import { requireSupabase } from '../../lib/supabase';
import { isRequestDetails, isRequestId, type CorporateRequestDetails } from '../corporate-requests/model';
import { exactCount, isCorporateRequest, isPendingCampaign, OVERVIEW_LIMIT, type CorporateRequest, type Counter, type OverviewResult, type PendingCampaign } from './model';

export type OverviewErrorKind = 'denied' | 'missing' | 'invalid' | 'unavailable';
export class OverviewReadError extends Error {
  readonly kind: OverviewErrorKind;
  constructor(kind: OverviewErrorKind) { super('Overview read failed'); this.name = 'OverviewReadError'; this.kind = kind; }
}
function responseError(code: string | undefined, status: number) {
  return new OverviewReadError(status === 401 || status === 403 || code === '42501' ? 'denied'
    : code === '42P01' || code === 'PGRST205' ? 'missing' : 'unavailable');
}
async function read<T>(operation: () => Promise<T>): Promise<OverviewResult<T>> {
  try { return { value: await operation(), loadedAt: Date.now() }; }
  catch (error) {
    if (error instanceof OverviewReadError) throw error;
    // Do not log or expose backend response bodies or advertiser data.
    throw new OverviewReadError('unavailable');
  }
}

/** Exact server HEAD counts, not a downloaded page length. No financial amounts. */
export function fetchOverviewCount(counter: Counter, signal: AbortSignal) {
  return read(async () => {
    const sb = requireSupabase();
    const { count, error, status } = counter === 'unpaid'
      ? await sb.from('advertiser_invoices').select('id', { count: 'exact', head: true }).eq('status', 'unpaid').abortSignal(signal)
      : await sb.from('ads').select('id', { count: 'exact', head: true }).eq('status', counter).abortSignal(signal);
    if (error) throw responseError(error.code, status);
    try { return exactCount(count); } catch { throw new OverviewReadError('invalid'); }
  });
}

/** Oldest pending campaigns by creation time; undated records follow dated ones. */
export function fetchPendingCampaigns(signal: AbortSignal): Promise<OverviewResult<PendingCampaign[]>> {
  return read(async () => {
    const { data, error, status } = await requireSupabase().from('ads')
      .select('id,display_id,title,name,created_at').eq('status', 'pending')
      .order('created_at', { ascending: true, nullsFirst: false }).order('id', { ascending: true })
      .limit(OVERVIEW_LIMIT).abortSignal(signal);
    if (error) throw responseError(error.code, status);
    if (!Array.isArray(data) || data.length > OVERVIEW_LIMIT || !data.every(isPendingCampaign)) throw new OverviewReadError('invalid');
    return data;
  });
}

/** Latest requests of every status. No assumed definition of an unprocessed request. */
export function fetchLatestCorporate(signal: AbortSignal): Promise<OverviewResult<CorporateRequest[]>> {
  return read(async () => {
    const { data, error, status } = await requireSupabase().from('corporate_requests')
      .select('id,company,created_at,status')
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .limit(OVERVIEW_LIMIT).abortSignal(signal);
    if (error) throw responseError(error.code, status);
    if (!Array.isArray(data) || data.length > OVERVIEW_LIMIT || !data.every(isCorporateRequest)) throw new OverviewReadError('invalid');
    return data;
  });
}

/** Same source and error handling as the existing latest-requests list; read only. */
export function fetchCorporateRequest(id: string, signal: AbortSignal): Promise<OverviewResult<CorporateRequestDetails | null>> {
  return read(async () => {
    if (!isRequestId(id)) throw new OverviewReadError('invalid');
    const { data, error, status } = await requireSupabase().from('corporate_requests')
      .select('id,company,contact_name,phone,email,message,status,manager_comment,created_at,updated_at,user_id')
      .eq('id', id).abortSignal(signal).maybeSingle();
    if (error) throw responseError(error.code, status);
    if (data === null) return null;
    if (!isRequestDetails(data) || data.id.toLowerCase() !== id.toLowerCase()) throw new OverviewReadError('invalid');
    return data;
  });
}
