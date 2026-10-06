// How a campaign stage looks in the list: badge, sub-line and the row button.
import type { BadgeTone, IconName } from '../../../design-system';
import type { Lang } from '../../../i18n/i18n';
import { formatDayMonth } from '../../../lib/format';
import { STATUS_TONE, statusLabelKey } from '../../campaignStatus';
import { CABINET_LINKS } from '../../sections';
import type { CampaignCard, CampaignStage, StageKind } from '../types';

export const STAGE_BADGE: Record<StageKind, { tone: BadgeTone; labelKey: string }> = {
  review: { tone: STATUS_TONE.pending, labelKey: statusLabelKey('pending') },
  awaitingPayment: { tone: 'warning', labelKey: 'cabinet.status.awaiting_payment' },
  rejected: { tone: STATUS_TONE.rejected, labelKey: statusLabelKey('rejected') },
  active: { tone: STATUS_TONE.active, labelKey: statusLabelKey('active') },
  paused: { tone: STATUS_TONE.paused, labelKey: statusLabelKey('paused') },
  hoursEnded: { tone: STATUS_TONE.hours_ended, labelKey: statusLabelKey('hours_ended') },
  noBudget: { tone: STATUS_TONE.budget_ended, labelKey: statusLabelKey('budget_ended') },
  finished: { tone: STATUS_TONE.completed, labelKey: statusLabelKey('completed') },
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** The line under the badge: what happens now or since when. */
export function stageNote(stage: CampaignStage, t: Translate, lang: Lang): string | null {
  switch (stage.kind) {
    case 'review':
      return t('campaigns.row.note.review');
    case 'awaitingPayment':
      return t('campaigns.row.note.approved');
    case 'rejected':
      return t('campaigns.row.note.rejected');
    case 'active':
    case 'paused':
      return stage.since ? t('campaigns.row.note.since', { date: formatDayMonth(stage.since, lang) }) : null;
    case 'hoursEnded':
    case 'noBudget':
      return t('campaigns.row.note.stopped');
    case 'finished':
      return stage.from && stage.to
        ? t('campaigns.row.note.period', { from: formatDayMonth(stage.from, lang), to: formatDayMonth(stage.to, lang) })
        : null;
  }
}

export interface RowAction {
  labelKey: string;
  to: string;
  variant: 'secondary' | 'ghost';
  iconLeft?: IconName;
  iconRight?: IconName;
}

function topUp(id: string): RowAction {
  // Payment screens are not designed yet: like Home, «Пополнить» leads to the campaign card.
  return { labelKey: 'campaigns.row.actions.topUp', to: CABINET_LINKS.campaign(id), variant: 'secondary', iconLeft: 'wallet' };
}

function stats(id: string): RowAction {
  return { labelKey: 'campaigns.row.actions.stats', to: CABINET_LINKS.campaignStats(id), variant: 'ghost', iconRight: 'arrow-right' };
}

export function rowAction({ id, stage }: CampaignCard): RowAction {
  switch (stage.kind) {
    case 'review':
      return { labelKey: 'campaigns.row.actions.open', to: CABINET_LINKS.campaign(id), variant: 'ghost', iconRight: 'arrow-right' };
    case 'awaitingPayment':
      return { labelKey: 'campaigns.row.actions.howToPay', to: CABINET_LINKS.campaign(id), variant: 'secondary', iconLeft: 'receipt' };
    case 'rejected':
      return { labelKey: 'campaigns.row.actions.fix', to: CABINET_LINKS.campaignFix(id), variant: 'secondary', iconLeft: 'pencil' };
    case 'active':
      return stage.low ? topUp(id) : stats(id);
    case 'noBudget':
      return topUp(id);
    case 'paused':
    case 'hoursEnded':
      return stats(id);
    case 'finished':
      return { labelKey: 'campaigns.row.actions.repeat', to: CABINET_LINKS.campaignCopy(id), variant: 'ghost', iconLeft: 'copy' };
  }
}
