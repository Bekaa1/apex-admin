import type { Database } from '../../../lib/database.types';
import { isCampaignId } from '../model';

export const REASONS = ['duration_7s', 'languages_kk_ru', 'prohibited', 'claims', 'flashing', 'metadata'] as const;
export type Reason = typeof REASONS[number];
export type Decision = { id: string; approve: boolean; reasons: string[]; comment: string };
export type ModerationIssue = 'not_authenticated' | 'forbidden' | 'not_found' | 'invalid_status' | 'invalid_reasons' | 'unavailable' | 'uncertain' | 'refresh_failed';
export class ModerationError extends Error {
  readonly kind: ModerationIssue;
  constructor(kind: ModerationIssue) { super('Administrative moderation failed'); this.name = 'ModerationError'; this.kind = kind; }
}
export function decisionArgs(decision: Decision): Database['public']['Functions']['admin_moderate_campaign']['Args'] {
  if (!isCampaignId(decision.id)) throw new ModerationError('not_found');
  if (decision.approve) return { p_id: decision.id, p_approve: true };
  const reasons = [...new Set(decision.reasons)];
  if (!reasons.length || reasons.some(reason => !REASONS.includes(reason as Reason))) throw new ModerationError('invalid_reasons');
  const comment = decision.comment.trim();
  return { p_id: decision.id, p_approve: false, p_reasons: reasons, ...(comment ? { p_comment: comment } : {}) };
}
/** Keep server details and potentially sensitive messages out of UI and logs. */
export function moderationIssue(error: unknown, status?: number): ModerationIssue {
  if (error instanceof ModerationError) return error.kind;
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const codes = ['not_authenticated', 'forbidden', 'not_found', 'invalid_status', 'invalid_reasons'] as const;
  for (const kind of codes) if ([value.code, value.message].some(text => typeof text === 'string' && new RegExp(`\\b${kind}\\b`).test(text))) return kind;
  if (status === 401 || value.code === 'PGRST301') return 'not_authenticated';
  if (status === 403 || value.code === '42501') return 'forbidden';
  if (['PGRST202', '42883'].includes(String(value.code))) return 'unavailable';
  // An unknown failure may have occurred after the server committed the decision.
  return 'uncertain';
}
export const terminalIssue = (issue: ModerationIssue | null) => issue !== null && ['not_authenticated', 'forbidden', 'not_found', 'invalid_status', 'unavailable'].includes(issue);
