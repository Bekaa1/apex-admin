import { getRequest } from '../api';
import { failure, RequestFailure } from '../errors';
import { canEdit, type StoreRequest } from '../model';
import { reviewRequest } from './model';
import { submitRequest } from './api';

export interface SubmitResult { record: StoreRequest; outcome: 'submitted' | 'changed'; reason: string }
export async function readSubmission(before: StoreRequest, reason = 'unknown'): Promise<SubmitResult> {
  let fresh: StoreRequest;
  try { fresh = await getRequest(before.id); }
  catch (error) {
    const parsed = failure(error);
    if (['forbidden', 'not_found', 'not_authenticated'].includes(parsed.kind)) throw parsed;
    throw new RequestFailure('unresolved');
  }
  const confirmed = !['revision_conflict', 'invalid_status'].includes(reason)
    && fresh.status === 'pending_owner_approval' && fresh.revision === before.revision + 1;
  return { record: fresh, outcome: confirmed ? 'submitted' : 'changed', reason };
}

export async function submitReviewed(record: StoreRequest, onRevision: (revision: number) => void): Promise<SubmitResult> {
  if (!canEdit(record)) throw new RequestFailure('forbidden');
  const review = reviewRequest(record), invalid = review.checks.find(check => !check.valid);
  if (invalid) throw new RequestFailure(invalid.step === 'details' ? 'invalid_store' : invalid.step === 'plan' ? 'invalid_plan' : 'invalid_zones');
  let revision: number;
  try { revision = await submitRequest(record.id, record.revision); }
  catch (error) {
    const parsed = failure(error);
    if (!['revision_conflict', 'invalid_status', 'unknown', 'invalid_response'].includes(parsed.kind)) throw parsed;
    return readSubmission(record, parsed.kind);
  }
  onRevision(revision);
  return readSubmission(record, 'success');
}
