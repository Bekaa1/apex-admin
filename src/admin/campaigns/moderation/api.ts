import { requireSupabase } from '../../../lib/supabase';
import { decisionArgs, ModerationError, moderationIssue, type Decision } from './model';

export async function moderateCampaign(decision: Decision): Promise<void> {
  const args = decisionArgs(decision);
  try {
    const { error, status } = await requireSupabase().rpc('admin_moderate_campaign', args)
      .retry(false).abortSignal(AbortSignal.timeout(30_000));
    if (error) throw new ModerationError(moderationIssue(error, status));
    // The returned string is not a status. Only a subsequent SELECT updates the card.
  } catch (error) { throw new ModerationError(moderationIssue(error)); }
}
