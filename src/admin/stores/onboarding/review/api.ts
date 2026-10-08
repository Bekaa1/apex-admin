import { requireSupabase } from '../../../../lib/supabase';
import { isStoreId } from '../../model';
import { readResult } from '../api';
import { logFailure, RequestFailure } from '../errors';

export async function submitRequest(id: string, revision: number): Promise<number> {
  if (!isStoreId(id) || !Number.isSafeInteger(revision) || revision < 1) throw new RequestFailure('invalid_response');
  const result = await readResult('admin_submit_store_request', () => requireSupabase().rpc('admin_submit_store_request', {
    p_id: id, p_expected_revision: revision,
  }).abortSignal(AbortSignal.timeout(20_000)));
  if (!Number.isSafeInteger(result) || result !== revision + 1) {
    const error = new RequestFailure('invalid_response'); logFailure('admin_submit_store_request', error); throw error;
  }
  return result;
}
