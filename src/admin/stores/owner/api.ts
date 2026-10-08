import { requireSupabase } from '../../../lib/supabase';
import { isStoreId } from '../model';
import { readResult } from '../onboarding/api';
import { logFailure, RequestFailure } from '../onboarding/errors';
import { normalizeQueue, validComment } from './model';

export async function getOwnerQueue(signal?: AbortSignal) {
  const data = await readResult('owner_list_pending_store_requests', () => requireSupabase().rpc('owner_list_pending_store_requests')
    .abortSignal(signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000)));
  try { return normalizeQueue(data, issue => console.warn('[store-owner-queue]', { code: 'invalid_row', ...issue })); }
  catch (error) { logFailure('owner_list_pending_store_requests', error); throw new RequestFailure('invalid_response'); }
}
function check(id: string, revision: number) {
  if (!isStoreId(id) || !Number.isSafeInteger(revision) || revision < 1) throw new RequestFailure('invalid_response');
}
export async function approveRequest(id: string, revision: number): Promise<string> {
  check(id, revision);
  const data = await readResult('owner_approve_store_request', () => requireSupabase().rpc('owner_approve_store_request', { p_id: id, p_expected_revision: revision })
    .abortSignal(AbortSignal.timeout(25_000)));
  if (!isStoreId(data)) throw new RequestFailure('invalid_response');
  return data;
}
export async function rejectRequest(id: string, revision: number, comment: string): Promise<number> {
  check(id, revision);
  if (!validComment(comment)) throw new RequestFailure('invalid_store', undefined, 'comment');
  const data = await readResult('owner_reject_store_request', () => requireSupabase().rpc('owner_reject_store_request', {
    p_id: id, p_expected_revision: revision, p_comment: comment.trim(),
  }).abortSignal(AbortSignal.timeout(25_000)));
  if (!Number.isSafeInteger(data) || data !== revision + 1) throw new RequestFailure('invalid_response');
  return data;
}
