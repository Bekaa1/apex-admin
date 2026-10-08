import { requireSupabase } from '../../lib/supabase';
import { filterError, invoiceNumber, isInvoiceId, isInvoiceRow, PAGE_SIZE, type InvoiceFilters, type InvoicePage, type InvoiceSelection } from './model';

export type InvoiceErrorKind = 'denied' | 'missing' | 'invalid' | 'unavailable';
export class InvoiceReadError extends Error {
  readonly kind: InvoiceErrorKind;
  constructor(kind: InvoiceErrorKind) { super('Administrative invoice read failed'); this.name = 'InvoiceReadError'; this.kind = kind; }
}
export function responseError(error: { code?: string } | null, status: number) {
  if (!error) return;
  throw new InvoiceReadError(status === 401 || status === 403 || error.code === '42501' ? 'denied'
    : ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? '') ? 'missing' : 'unavailable');
}
function pageQuery(filters: InvoiceFilters, probe = false, clientId?: string) {
  let request = requireSupabase().from('advertiser_invoices').select(
    'id,number,user_id,ad_id,kind,amount,status,issued_at,paid_at', probe ? undefined : { count: 'exact' });
  if (clientId !== undefined) request = request.eq('user_id', clientId);
  const number = invoiceNumber(filters.search);
  if (number === undefined) throw new InvoiceReadError('invalid');
  if (number !== null) request = request.eq('number', number);
  if (filters.status !== '') request = request.eq('status', filters.status);
  if (filters.kind !== '') request = request.eq('kind', filters.kind);
  return request.order('issued_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
}
async function hasFollowingRow(filters: InvoiceFilters, offset: number, signal: AbortSignal, clientId?: string): Promise<boolean> {
  const { data, error, status } = await pageQuery(filters, true, clientId).range(offset, offset).abortSignal(signal);
  if (status === 416 && error?.code === 'PGRST103') return false;
  responseError(error, status);
  if (!Array.isArray(data) || data.length > 1 || !data.every(row => row && typeof row === 'object' && 'id' in row && isInvoiceId(row.id))) throw new InvoiceReadError('invalid');
  return data.length === 1;
}
type Lookup = { names: Map<string, string>; unavailable: boolean };
async function profiles(ids: string[], signal: AbortSignal): Promise<Lookup> {
  const names = new Map<string, string>();
  if (!ids.length) return { names, unavailable: false };
  try {
    // Explicit user_id -> users.id lookup; no unconfirmed FK join.
    const { data, error } = await requireSupabase().from('users').select('id,company_name,full_name,display_name').in('id', ids).limit(PAGE_SIZE).abortSignal(signal);
    if (error || !Array.isArray(data)) return { names, unavailable: true };
    for (const row of data) {
      if (!row || !ids.includes(row.id)) continue;
      const name = [row.company_name, row.full_name, row.display_name].find(value => typeof value === 'string' && value.trim());
      if (name) names.set(row.id, name);
    }
    return { names, unavailable: ids.some(id => !names.has(id)) };
  } catch { return { names, unavailable: true }; }
}
async function campaigns(ids: string[], signal: AbortSignal): Promise<Lookup> {
  const names = new Map<string, string>();
  if (!ids.length) return { names, unavailable: false };
  try {
    // advertiser_invoices_ad_id_fkey -> ads.id is present in database.types.ts.
    const { data, error } = await requireSupabase().from('ads').select('id,title,name').in('id', ids).limit(PAGE_SIZE).abortSignal(signal);
    if (error || !Array.isArray(data)) return { names, unavailable: true };
    for (const row of data) {
      if (!row || !ids.includes(row.id)) continue;
      const name = [row.title, row.name].find(value => typeof value === 'string' && value.trim());
      if (name) names.set(row.id, name);
    }
    return { names, unavailable: ids.some(id => !names.has(id)) };
  } catch { return { names, unavailable: true }; }
}
export async function fetchInvoiceNames(userIds: string[], campaignIds: string[], signal: AbortSignal) {
  const [users, ads] = await Promise.all([profiles(userIds, signal), campaigns(campaignIds, signal)]);
  signal.throwIfAborted();
  return { users, ads };
}
/** Read-only, bounded administrative source. A profile/campaign failure never erases invoices. */
export async function fetchInvoicePage(selection: InvoiceSelection, signal: AbortSignal, clientId?: string): Promise<InvoicePage> {
  if (clientId !== undefined && !isInvoiceId(clientId)) throw new InvoiceReadError('invalid');
  const { filters, page } = selection;
  if (selection.error || filterError(filters) || !Number.isSafeInteger(page) || page < 1 || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE)) throw new InvoiceReadError('invalid');
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const { data, error, status, count } = await pageQuery(filters, false, clientId).range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
    if (offset > 0 && status === 416 && error?.code === 'PGRST103') return { rows: [], count: null, hasNext: false, profilesUnavailable: false, campaignsUnavailable: false };
    responseError(error, status);
    if (!Array.isArray(data) || !data.every(isInvoiceRow) || clientId !== undefined && data.some(row => row.user_id.toLowerCase() !== clientId.toLowerCase()) || data.length > PAGE_SIZE || new Set(data.map(row => row.id)).size !== data.length
      || count !== null && (!Number.isSafeInteger(count) || count < 0 || data.length !== Math.min(PAGE_SIZE, Math.max(0, count - offset)))) throw new InvoiceReadError('invalid');
    const [users, ads, hasNext] = await Promise.all([
      profiles([...new Set(data.map(row => row.user_id))], signal),
      campaigns([...new Set(data.map(row => row.ad_id))], signal),
      count === null ? hasFollowingRow(filters, offset + data.length, signal, clientId) : Promise.resolve(offset + data.length < count),
    ]);
    if (count === null && data.length < PAGE_SIZE && hasNext) throw new InvoiceReadError('invalid');
    signal.throwIfAborted();
    return { rows: data.map(row => ({ ...row, advertiser: users.names.get(row.user_id) ?? null, campaign: ads.names.get(row.ad_id) ?? null })),
      count, hasNext, profilesUnavailable: users.unavailable, campaignsUnavailable: ads.unavailable };
  } catch (error) {
    if (error instanceof InvoiceReadError) throw error;
    throw new InvoiceReadError('unavailable');
  }
}
