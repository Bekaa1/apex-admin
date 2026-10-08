import { requireSupabase } from '../../../../lib/supabase';
import type { Json } from '../../../../lib/database.types';
import { isStoreId } from '../../model';
import { readResult } from '../api';
import { logFailure, RequestFailure } from '../errors';
import { validateFileName, validatePlan, type PlanDraft } from './model';

export async function saveStorePlan(id: string, revision: number, draft: PlanDraft): Promise<number> {
  if (!isStoreId(id) || !Number.isSafeInteger(revision) || revision < 1) throw new RequestFailure('invalid_response');
  validatePlan(draft.data); validateFileName(draft.name);
  const data = await readResult('admin_save_store_plan', () => requireSupabase().rpc('admin_save_store_plan', {
    p_id: id, p_expected_revision: revision, p_plan: draft.data as unknown as Json,
    ...(draft.name === null ? {} : { p_source_file_name: draft.name }),
  }).abortSignal(AbortSignal.timeout(20_000)));
  if (!Number.isSafeInteger(data) || data !== revision + 1) {
    const error = new RequestFailure('invalid_response'); logFailure('admin_save_store_plan', error); throw error;
  }
  return data;
}
