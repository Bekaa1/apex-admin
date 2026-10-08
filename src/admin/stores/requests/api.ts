import { requireSupabase } from '../../../lib/supabase';
import { readResult } from '../onboarding/api';
import { RequestFailure, logFailure } from '../onboarding/errors';
import { isStatus, normalizeRows, type RequestStatus, type RowDiagnostic } from './model';

function reportRow({ index, fields }: RowDiagnostic) {
  // Only row position and fixed field names. Never log IDs, contact/store data or raw rows.
  console.warn('[store-request-list]', { operation: 'admin_list_store_requests', code: 'invalid_row', index, fields });
}
export async function fetchRequests(status: RequestStatus | '', signal?: AbortSignal) {
  if (status && !isStatus(status)) throw new RequestFailure('invalid_response');
  const data = await readResult('admin_list_store_requests', () => requireSupabase().rpc('admin_list_store_requests', status ? { p_status: status } : {})
    .abortSignal(signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000)));
  try { return normalizeRows(data, reportRow); }
  catch (error) { logFailure('admin_list_store_requests', error); throw new RequestFailure('invalid_response'); }
}
