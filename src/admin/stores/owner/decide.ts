import { getRequest } from '../onboarding/api';
import { failure, RequestFailure } from '../onboarding/errors';
import type { StoreRequest } from '../onboarding/model';
import { approveRequest, rejectRequest } from './api';
import { canDecide, validComment, type Decision } from './model';

export interface DecisionResult { record: StoreRequest; outcome: 'approved' | 'rejected' | 'pending' | 'changed'; reason: string }
export async function readDecision(id: string, decision: Decision, reason = 'unknown'): Promise<DecisionResult> {
  let record: StoreRequest;
  try { record = await getRequest(id); }
  catch (error) {
    const parsed = failure(error);
    if (['forbidden', 'not_found', 'not_authenticated'].includes(parsed.kind)) throw parsed;
    throw new RequestFailure('unresolved');
  }
  const conflict = ['revision_conflict', 'invalid_status', 'already_published'].includes(reason);
  const outcome = conflict ? 'changed'
    : decision === 'approve' && record.status === 'approved' && record.published_store_id ? 'approved'
    : decision === 'reject' && record.status === 'rejected' ? 'rejected'
    : record.status === 'pending_owner_approval' ? 'pending' : 'changed';
  return { record, outcome, reason };
}
/** One explicit mutation. An ambiguous response always becomes a read, never an automatic retry. */
export async function decideRequest(owner: boolean, record: StoreRequest, decision: Decision, comment: string,
  onReturned: (result: { storeId?: string; revision?: number }) => void): Promise<DecisionResult> {
  if (!canDecide(owner, record)) throw new RequestFailure(owner ? 'invalid_status' : 'forbidden');
  if (decision === 'reject' && !validComment(comment)) throw new RequestFailure('invalid_store', undefined, 'comment');
  try {
    if (decision === 'approve') onReturned({ storeId: await approveRequest(record.id, record.revision) });
    else onReturned({ revision: await rejectRequest(record.id, record.revision, comment) });
  } catch (error) {
    const parsed = failure(error);
    if (!['unknown', 'invalid_response', 'invalid_status', 'revision_conflict', 'already_published'].includes(parsed.kind)) throw parsed;
    return readDecision(record.id, decision, parsed.kind);
  }
  return readDecision(record.id, decision, 'success');
}
