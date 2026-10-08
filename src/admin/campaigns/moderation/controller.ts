import { decisionArgs, moderationIssue, terminalIssue, type Decision, type ModerationIssue } from './model';

export interface DecisionState { busy: boolean; issue: ModerationIssue | null; needsRefresh: boolean; succeeded: boolean; reviewed: boolean }
export const INITIAL_DECISION: DecisionState = { busy: false, issue: null, needsRefresh: false, succeeded: false, reviewed: false };
interface Dependencies {
  authorize: () => 'not_authenticated' | 'forbidden' | null;
  pending: () => boolean;
  send: (decision: Decision) => Promise<void>;
  refresh: () => Promise<{ status: string | null } | null>;
  changed: (state: DecisionState) => void;
  denied: () => void;
}

/** Synchronous lock covers clicks occurring before React's next render.
 * Server-side concurrent decision protection remains an independent requirement.
 */
export function createDecisionController(deps: Dependencies) {
  let state = { ...INITIAL_DECISION };
  let active = true;
  const change = (patch: Partial<DecisionState>) => {
    if (!active) return;
    state = { ...state, ...patch };
    deps.changed(state);
  };
  const authorize = () => {
    const issue = deps.authorize();
    if (issue) { change({ issue }); if (issue === 'forbidden') deps.denied(); }
    return !issue;
  };
  async function reconcile() {
    try {
      const row = await deps.refresh();
      if (!active) return;
      change({ needsRefresh: false, reviewed: true, issue: row === null ? 'not_found' : row.status !== 'pending' && !state.succeeded ? 'invalid_status' : null });
    } catch { change({ issue: 'refresh_failed', needsRefresh: true }); }
  }
  return {
    activate() { active = true; },
    dispose() { active = false; },
    snapshot: () => state,
    async refresh() {
      if (!active || state.busy || !authorize()) return;
      change({ busy: true });
      try { await reconcile(); } finally { change({ busy: false }); }
    },
    async submit(decision: Decision) {
      if (!active || state.busy || state.needsRefresh || state.succeeded || terminalIssue(state.issue) || !authorize()) return;
      if (!deps.pending()) { change({ issue: 'invalid_status' }); return; }
      try { decisionArgs(decision); } catch (error) { change({ issue: moderationIssue(error) }); return; }
      change({ busy: true, issue: null, reviewed: false });
      try {
        await deps.send(decision);
        if (!active) return;
        change({ succeeded: true, needsRefresh: true });
        if (authorize()) await reconcile();
      } catch (error) {
        if (!active) return;
        const issue = moderationIssue(error);
        change({ issue, needsRefresh: issue === 'uncertain' || issue === 'invalid_status' });
        if (issue === 'forbidden') deps.denied();
        if (issue === 'invalid_status' && authorize()) {
          await reconcile();
          if (!state.needsRefresh && !state.issue) change({ issue: 'invalid_status' });
        }
      } finally { change({ busy: false }); }
    },
  };
}
