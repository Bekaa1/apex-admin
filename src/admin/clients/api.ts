import { requireSupabase } from '../../lib/supabase';
import { clientsAccessConfigured } from './access';
import { CLIENT_PAGE_SIZE, clientFilterError, clientSearchFilter, displayNumber, isClientId, isClientRow, type ClientFilters, type ClientSelection, type ClientPageData, type ClientRow } from './model';

const PROFILE_COLUMNS = 'id,display_id,full_name,display_name,company_name,bin,email,phone,created_at';

export type ClientErrorKind = 'unconfigured' | 'denied' | 'missing' | 'invalid' | 'unavailable';
export class ClientReadError extends Error {
  readonly kind: ClientErrorKind;
  constructor(kind: ClientErrorKind) { super('Administrative client read failed'); this.name = 'ClientReadError'; this.kind = kind; }
}
function responseError(error: { code?: string } | null, status: number) {
  if (error) throw new ClientReadError(status === 401 || status === 403 || error.code === '42501' ? 'denied'
    : ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? '') ? 'missing' : 'unavailable');
}
/** Prepared users adapter, not an approved all-client source. Before enabling access,
 * reconcile this source and client-selection rule with the confirmed backend contract.
 * No invented role values; no balance/is_active fields. Never exported without the gate.
 */
function pageQuery(filters: ClientFilters, count: boolean) {
  let query = requireSupabase().from('users')
    .select(PROFILE_COLUMNS, count ? { count: 'exact' } : undefined);
  if (filters.search !== '') query = query.or(clientSearchFilter(filters.search));
  const number = displayNumber(filters.displayId);
  if (number === undefined) throw new ClientReadError('invalid');
  if (number !== null) query = query.eq('display_id', number);
  return query.order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
}

/** Same unconfirmed source as the list: never bypass its access/scope gate for a card. */
export async function fetchClientProfile(id: string, signal: AbortSignal): Promise<ClientRow | null> {
  if (!clientsAccessConfigured()) throw new ClientReadError('unconfigured');
  if (!isClientId(id)) throw new ClientReadError('invalid');
  try {
    const { data, error, status } = await requireSupabase().from('users').select(PROFILE_COLUMNS)
      .eq('id', id).abortSignal(signal).maybeSingle();
    responseError(error, status);
    if (data === null) return null;
    if (!isClientRow(data) || data.id.toLowerCase() !== id.toLowerCase()) throw new ClientReadError('invalid');
    return data;
  } catch (error) {
    if (error instanceof ClientReadError) throw error;
    throw new ClientReadError('unavailable');
  }
}
async function hasFollowingRow(filters: ClientFilters, offset: number, signal: AbortSignal): Promise<boolean> {
  const { data, error, status } = await pageQuery(filters, false).range(offset, offset).abortSignal(signal);
  if (status === 416 && error?.code === 'PGRST103') return false;
  responseError(error, status);
  if (!Array.isArray(data) || data.length > 1 || !data.every(isClientRow)) throw new ClientReadError('invalid');
  return data.length === 1;
}
export async function fetchClientPage(selection: ClientSelection, signal: AbortSignal): Promise<ClientPageData> {
  // Fail closed before obtaining the client, including a direct/manual refetch call.
  if (!clientsAccessConfigured()) throw new ClientReadError('unconfigured');
  const { filters, page } = selection;
  if (selection.error || clientFilterError(filters) || !Number.isSafeInteger(page) || page < 1
    || page > Math.floor(Number.MAX_SAFE_INTEGER / CLIENT_PAGE_SIZE)) throw new ClientReadError('invalid');
  try {
    const offset = (page - 1) * CLIENT_PAGE_SIZE;
    const { data, error, status, count } = await pageQuery(filters, true).range(offset, offset + CLIENT_PAGE_SIZE - 1).abortSignal(signal);
    if (offset > 0 && status === 416 && error?.code === 'PGRST103') return { rows: [], count: null, hasNext: false };
    responseError(error, status);
    if (!Array.isArray(data) || !data.every(isClientRow) || data.length > CLIENT_PAGE_SIZE
      || new Set(data.map(row => row.id)).size !== data.length
      || count !== null && (!Number.isSafeInteger(count) || count < 0 || data.length !== Math.min(CLIENT_PAGE_SIZE, Math.max(0, count - offset)))) throw new ClientReadError('invalid');
    const hasNext = count === null ? await hasFollowingRow(filters, offset + data.length, signal) : offset + data.length < count;
    if (count === null && data.length < CLIENT_PAGE_SIZE && hasNext) throw new ClientReadError('invalid');
    return { rows: data, count, hasNext };
  } catch (error) {
    if (error instanceof ClientReadError) throw error;
    // No contacts, names, filter values or raw server details in logs/errors.
    throw new ClientReadError('unavailable');
  }
}
