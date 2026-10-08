import type { PaymentReview } from '../details/model';
import { paymentIssue, type PaymentIssue } from './model';

export interface PaymentState {
  busy: boolean; attempted: boolean; acknowledged: boolean; verified: boolean;
  issue: PaymentIssue | null; needsRefresh: boolean;
}
export const INITIAL_PAYMENT: PaymentState = { busy: false, attempted: false, acknowledged: false, verified: false, issue: null, needsRefresh: false };
export function resumePayment(saved?: PaymentState): PaymentState {
  if (!saved) return { ...INITIAL_PAYMENT };
  return saved.busy ? { ...saved, busy: false, issue: 'uncertain', needsRefresh: true } : { ...saved };
}
interface Dependencies {
  authorize: () => 'not_authenticated' | 'forbidden' | null;
  matches: (review: PaymentReview) => boolean;
  send: (id: string) => Promise<void>;
  refresh: () => Promise<{ status: string | null } | null>;
  changed: (state: PaymentState) => void;
  denied: () => void;
}
/** One financial attempt per mounted/cache-restored workflow. A SELECT never retries the RPC. */
export function createPaymentController(deps: Dependencies, saved?: PaymentState) {
  let state = resumePayment(saved);
  let active = true;
  const change = (patch: Partial<PaymentState>) => {
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
    if (!active || !authorize()) return;
    try {
      const row = await deps.refresh();
      if (!active || !authorize()) return;
      if (row?.status === 'paid') change({ verified: true, needsRefresh: false, issue: null });
      else if (!row) change({ verified: false, needsRefresh: false, issue: 'not_found' });
      else if (row.status !== 'unpaid') change({ verified: false, needsRefresh: false, issue: 'invalid_status' });
      else change({ verified: false, needsRefresh: state.attempted,
        issue: state.attempted ? state.issue === 'invalid_status' ? 'invalid_status' : state.acknowledged ? 'unverified' : 'uncertain' : state.issue === 'changed' ? 'changed' : null });
    } catch (error) {
      if (!active || !authorize()) return;
      const issue = paymentIssue(error);
      change({ issue: ['forbidden', 'not_authenticated'].includes(issue) ? issue : 'refresh_failed', needsRefresh: true });
      if (issue === 'forbidden') deps.denied();
    }
  }
  return {
    activate() { active = true; },
    dispose() { active = false; },
    snapshot: () => state,
    review() {
      if (active && !state.busy && !state.attempted && !state.verified) change({ issue: null, needsRefresh: false });
    },
    async refresh() {
      if (!active || state.busy || !authorize()) return;
      change({ busy: true });
      try { await reconcile(); } finally { change({ busy: false }); }
    },
    async submit(review: PaymentReview) {
      if (!active || state.busy || state.attempted || state.verified || !authorize()) return;
      if (!deps.matches(review)) {
        change({ busy: true, issue: 'changed' });
        try { await reconcile(); } finally { change({ busy: false }); }
        return;
      }
      // Synchronous before mutateAsync or React render, also persisted by the hook.
      change({ busy: true, attempted: true, issue: null, needsRefresh: true });
      try {
        await deps.send(review.id);
        if (!active) return;
        change({ acknowledged: true });
        await reconcile();
      } catch (error) {
        if (!active) return;
        const issue = paymentIssue(error);
        change({ issue, needsRefresh: issue === 'uncertain' || issue === 'invalid_status' });
        if (issue === 'forbidden') deps.denied();
        if (issue === 'uncertain' || issue === 'invalid_status') await reconcile();
      } finally { change({ busy: false }); }
    },
  };
}
