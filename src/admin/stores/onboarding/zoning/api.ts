import { requireSupabase } from '../../../../lib/supabase';
import { isStoreId } from '../../model';
import { readResult } from '../api';
import { logFailure, RequestFailure } from '../errors';
import type { ZoningPayload } from './model';

export async function replaceZoning(id: string, revision: number, payload: ZoningPayload): Promise<number> {
  if (!isStoreId(id) || !Number.isSafeInteger(revision) || revision < 1) throw new RequestFailure('invalid_response');
  const result = await readResult('admin_replace_store_zoning', () => requireSupabase().rpc('admin_replace_store_zoning', {
    p_id: id, p_expected_revision: revision, p_zones: payload.zones.map(zone => ({ ...zone })), p_assignments: payload.assignments,
  }).abortSignal(AbortSignal.timeout(20_000)));
  if (!Number.isSafeInteger(result) || result !== revision + 1) {
    const error = new RequestFailure('invalid_response'); logFailure('admin_replace_store_zoning', error); throw error;
  }
  return result;
}
