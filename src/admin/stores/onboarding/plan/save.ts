import { getRequest } from '../api';
import { canEdit, type StoreRequest } from '../model';
import { failure, RequestFailure } from '../errors';
import { PlanIssue, sameJson, type PlanDraft } from './model';
import { saveStorePlan } from './api';

export interface PlanSaveResult { record: StoreRequest; outcome: 'saved' | 'changed'; readOnly: boolean }
export async function savePlan(record: StoreRequest, draft: PlanDraft): Promise<PlanSaveResult> {
  if (!canEdit(record)) throw new RequestFailure('forbidden');
  try {
    const revision = await saveStorePlan(record.id, record.revision, draft);
    return { record: { ...record, revision, plan: { plan_data: draft.data, source_file_name: draft.name } }, outcome: 'saved', readOnly: false };
  } catch (error) {
    if (error instanceof PlanIssue) throw error;
    const parsed = failure(error);
    if (!['revision_conflict', 'invalid_status', 'unknown', 'invalid_response'].includes(parsed.kind)) throw error;
    let fresh: StoreRequest;
    try { fresh = await getRequest(record.id); }
    catch (readError) {
      const readFailure = failure(readError);
      if (['forbidden', 'not_found', 'not_authenticated'].includes(readFailure.kind)) throw readFailure;
      throw new RequestFailure(parsed.kind === 'invalid_status' ? 'invalid_status' : 'unresolved');
    }
    const confirmed = !['revision_conflict', 'invalid_status'].includes(parsed.kind)
      && fresh.revision === record.revision + 1 && sameJson(fresh.plan?.plan_data, draft.data);
    return { record: fresh, outcome: confirmed ? 'saved' : 'changed', readOnly: parsed.kind === 'invalid_status' || !canEdit(fresh) };
  }
}
