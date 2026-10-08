import { getRequest } from '../api';
import { canEdit, type StoreRequest } from '../model';
import { failure, RequestFailure } from '../errors';
import { sameJson } from '../plan/model';
import { matchesSaved, restoreZoning, zoningPayload, type ZoningDraft, type ZoningPayload } from './model';
import { replaceZoning } from './api';

export interface ZoningSaveResult { record: StoreRequest; outcome: 'saved' | 'changed'; readOnly: boolean }
export async function readZoningResult(before: StoreRequest, sent: ZoningPayload, reason = 'unknown'): Promise<ZoningSaveResult> {
  let fresh: StoreRequest;
  try { fresh = await getRequest(before.id); restoreZoning(fresh); }
  catch (error) {
    const parsed = failure(error);
    if (['forbidden', 'not_found', 'not_authenticated'].includes(parsed.kind)) throw parsed;
    if (reason === 'invalid_status') throw new RequestFailure('invalid_status');
    if (parsed.kind === 'invalid_plan') throw parsed;
    throw new RequestFailure(reason === 'invalid_status' ? 'invalid_status' : 'unresolved');
  }
  const confirmed = reason !== 'revision_conflict' && reason !== 'invalid_status'
    && fresh.revision === before.revision + 1 && sameJson(before.plan?.plan_data, fresh.plan?.plan_data) && matchesSaved(fresh, sent);
  return { record: fresh, outcome: confirmed ? 'saved' : 'changed', readOnly: reason === 'invalid_status' || !canEdit(fresh) };
}
export async function saveZoning(record: StoreRequest, draft: ZoningDraft, onRevision: (revision: number) => void): Promise<ZoningSaveResult> {
  if (!canEdit(record)) throw new RequestFailure('forbidden');
  const { plan } = restoreZoning(record), payload = zoningPayload(draft, plan);
  let revision: number;
  try { revision = await replaceZoning(record.id, record.revision, payload); }
  catch (error) {
    const parsed = failure(error);
    if (!['revision_conflict', 'invalid_status', 'unknown', 'invalid_response'].includes(parsed.kind)) throw parsed;
    return readZoningResult(record, payload, parsed.kind);
  }
  onRevision(revision);
  // New server UUIDs must be read even after a confirmed write. Never fabricate zone IDs.
  return readZoningResult(record, payload, 'success');
}
