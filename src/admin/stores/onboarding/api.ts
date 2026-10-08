import { requireSupabase } from '../../../lib/supabase';
import { isStoreId } from '../model';
import { parseRequest, trimmed, type StoreFields } from './model';
import { failure, logFailure, RequestFailure } from './errors';

function checkId(id: string) { if (!isStoreId(id)) throw new RequestFailure('invalid_response'); }
function invalidReply(operation: string): never {
  const error = new RequestFailure('invalid_response');
  logFailure(operation, error);
  throw error;
}
export async function readResult<T>(operation: string, read: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  try {
    const { data, error } = await read();
    if (error) throw error;
    return data;
  } catch (error) { logFailure(operation, error); throw failure(error); }
}
export async function getRequest(id: string, signal?: AbortSignal) {
  checkId(id);
  const data = await readResult('get_store_request', () => requireSupabase().rpc('get_store_request', { p_id: id })
    .abortSignal(signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000)));
  try { return parseRequest(data, id); } catch (error) { logFailure('get_store_request', error); throw failure(error); }
}
export async function createRequest(key: string, fields: StoreFields): Promise<string> {
  checkId(key);
  const v = trimmed(fields);
  const data = await readResult('admin_create_store_request', () => requireSupabase().rpc('admin_create_store_request', {
    p_request_key: key, p_name: v.name, p_city: v.city, p_address: v.address, p_timezone: v.timezone,
    // Omitted p_partner_id defaults to SQL NULL; generated Args disallows explicit null.
  }).abortSignal(AbortSignal.timeout(20_000)));
  if (!isStoreId(data)) invalidReply('admin_create_store_request');
  return data;
}
export async function updateRequest(id: string, revision: number, fields: StoreFields): Promise<number> {
  checkId(id);
  if (!Number.isSafeInteger(revision) || revision < 1) throw new RequestFailure('invalid_response');
  const v = trimmed(fields);
  const data = await readResult('admin_update_store_request', () => requireSupabase().rpc('admin_update_store_request', {
    p_id: id, p_expected_revision: revision, p_name: v.name, p_city: v.city, p_address: v.address, p_timezone: v.timezone,
  }).abortSignal(AbortSignal.timeout(20_000)));
  if (!Number.isSafeInteger(data) || data !== revision + 1) invalidReply('admin_update_store_request');
  return data;
}
