import { createRequest, getRequest, updateRequest } from './api';
import { canEdit, sameFields, trimmed, type StoreFields, type StoreRequest } from './model';
import { failure, RequestFailure } from './errors';
import type { AttemptStore } from './attempt';

export interface SaveResult { record: StoreRequest; outcome: 'saved' | 'changed' | 'unchanged'; created: boolean }
/** No retries here. Unknown update outcomes are reconciled by a READ, never a second write. */
export async function saveDetails(record: StoreRequest | null, fields: StoreFields, attempts: AttemptStore): Promise<SaveResult> {
  const values = trimmed(fields);
  if (!record) {
    const recovered = attempts.read();
    if (recovered?.requestId) return { record: await getRequest(recovered.requestId), outcome: 'saved', created: true };
    const attempt = attempts.prepare(values);
    try {
      const id = await createRequest(attempt.key, attempt.values);
      attempts.complete(id);
      return { record: { ...attempt.values, id, revision: 1, status: 'inactive', is_mine: true, review_comment: null, published_store_id: null }, outcome: 'saved', created: true };
    } catch (error) {
      const parsed = failure(error);
      if (!['unknown', 'invalid_response'].includes(parsed.kind)) attempts.rejected();
      throw parsed;
    }
  }
  if (!canEdit(record)) throw new RequestFailure('forbidden');
  try {
    const revision = await updateRequest(record.id, record.revision, values);
    return { record: { ...record, ...values, revision }, outcome: 'saved', created: false };
  } catch (error) {
    const parsed = failure(error);
    if (!['revision_conflict', 'invalid_status', 'unknown', 'invalid_response'].includes(parsed.kind)) throw parsed;
    let fresh: StoreRequest;
    try { fresh = await getRequest(record.id); }
    catch (readError) {
      const readFailure = failure(readError);
      if (['forbidden', 'not_found', 'not_authenticated'].includes(readFailure.kind)) throw readFailure;
      throw new RequestFailure('unresolved');
    }
    if (parsed.kind === 'revision_conflict' || parsed.kind === 'invalid_status') return { record: fresh, outcome: 'changed', created: false };
    const outcome = fresh.revision === record.revision + 1 && sameFields(fresh, values) ? 'saved'
      : fresh.revision === record.revision ? 'unchanged' : 'changed';
    return { record: fresh, outcome, created: false };
  }
}
