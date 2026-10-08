// Where a campaign is, from the advertiser's side: shared by «Мои кампании» and «Статистика».
import type { BadgeTone } from '../design-system';
import type { Database } from '../lib/database.types';
import type { BudgetFigures } from './campaignBudget';
import { STATUS_TONE, statusLabelKey } from './campaignStatus';

type StatsRow = Database['public']['Views']['my_campaigns_stats']['Row'];

/** The `my_campaigns_stats` fields the stage depends on. */
export type StageRow = Pick<
  StatsRow,
  | 'status'
  | 'start_date'
  | 'end_date'
  | 'submitted_at'
  | 'budget'
  | 'paid_amount'
  | 'unpaid_amount'
  | 'invoice_sent_to'
  | 'rejection_reasons'
  | 'moderator_comment'
  | 'paused_at'
  | 'paused_by'
>;

export interface Moderation {
  /** Codes of the broken rules, texts in `campaigns.rules.*`. */
  rules: string[];
  comment: string | null;
}

/** Where the campaign is. `null` means the backend doesn't tell yet, and that part is not shown. */
export type CampaignStage =
  | { kind: 'review'; paid: boolean | null }
  /** A launched campaign was edited: shows are paused until the moderator approves the changes. */
  | { kind: 'changesReview'; since: string | null }
  | { kind: 'awaitingPayment'; invoice: { amount: number; sentTo: string } | null }
  | { kind: 'rejected'; paid: boolean | null; moderation: Moderation | null }
  | { kind: 'active'; since: string | null; low: boolean }
  /** `byAdvertiser`: they paused it themselves and may resume it (`resume_campaign`); otherwise the Apexmedia team did. */
  | { kind: 'paused'; since: string | null; pausedAt: string | null; byAdvertiser: boolean }
  | { kind: 'hoursEnded' }
  | { kind: 'noBudget' }
  | { kind: 'finished'; from: string | null; to: string | null };

export type StageKind = CampaignStage['kind'];

/** Stages after the first approval: the campaign has shown or shows now. */
export const LAUNCHED_STAGES: StageKind[] = ['changesReview', 'active', 'paused', 'hoursEnded', 'noBudget', 'finished'];

/** `null` when the view has no amounts for the campaign. */
function paidState(row: StageRow): boolean | null {
  if (row.paid_amount == null || !row.budget) return null;
  return row.paid_amount >= row.budget;
}

export function stageOf(row: StageRow, money: BudgetFigures): CampaignStage | null {
  switch (row.status) {
    case 'pending':
      // Only an edit sends a campaign that has already shown back to moderation.
      return row.start_date ? { kind: 'changesReview', since: row.submitted_at } : { kind: 'review', paid: paidState(row) };
    case 'awaiting_payment':
      return {
        kind: 'awaitingPayment',
        invoice: row.unpaid_amount && row.invoice_sent_to ? { amount: row.unpaid_amount, sentTo: row.invoice_sent_to } : null,
      };
    case 'rejected':
      return {
        kind: 'rejected',
        paid: paidState(row),
        moderation: row.rejection_reasons?.length || row.moderator_comment ? { rules: row.rejection_reasons ?? [], comment: row.moderator_comment ?? null } : null,
      };
    case 'active':
      return money.ended ? { kind: 'noBudget' } : { kind: 'active', since: row.start_date, low: money.low };
    case 'paused':
      return money.ended ? { kind: 'noBudget' } : { kind: 'paused', since: row.start_date, pausedAt: row.paused_at, byAdvertiser: row.paused_by === 'advertiser' };
    case 'hours_ended':
      return { kind: 'hoursEnded' };
    case 'budget_ended':
      return { kind: 'noBudget' };
    case 'completed':
      return { kind: 'finished', from: row.start_date, to: row.end_date };
    // Drafts are not part of the product yet; archived and deleted campaigns are hidden, as on Home.
    case 'draft':
    case 'archived':
    case 'deleted':
    case null:
      return null;
  }
}

export const STAGE_BADGE: Record<StageKind, { tone: BadgeTone; labelKey: string }> = {
  review: { tone: STATUS_TONE.pending, labelKey: statusLabelKey('pending') },
  changesReview: { tone: STATUS_TONE.pending, labelKey: statusLabelKey('pending') },
  awaitingPayment: { tone: STATUS_TONE.awaiting_payment, labelKey: statusLabelKey('awaiting_payment') },
  rejected: { tone: STATUS_TONE.rejected, labelKey: statusLabelKey('rejected') },
  active: { tone: STATUS_TONE.active, labelKey: statusLabelKey('active') },
  paused: { tone: STATUS_TONE.paused, labelKey: statusLabelKey('paused') },
  hoursEnded: { tone: STATUS_TONE.hours_ended, labelKey: statusLabelKey('hours_ended') },
  noBudget: { tone: STATUS_TONE.budget_ended, labelKey: statusLabelKey('budget_ended') },
  finished: { tone: STATUS_TONE.completed, labelKey: statusLabelKey('completed') },
};

// The statuses `edit_campaign` and `extend_campaign` accept; the server checks them again.
const EDITABLE = ['pending', 'rejected', 'awaiting_payment', 'active', 'budget_ended'];
const EXTENDABLE = ['active', 'budget_ended'];

export function isExtendableStatus(status: string | null): boolean {
  return EXTENDABLE.includes(status ?? '');
}

export function campaignAbilities(row: { status: string | null; tariff_can_extend: boolean | null }): { canEdit: boolean; canTopUp: boolean } {
  return { canEdit: EDITABLE.includes(row.status ?? ''), canTopUp: isExtendableStatus(row.status) && row.tariff_can_extend === true };
}
