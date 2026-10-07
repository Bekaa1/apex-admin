// How a campaign stage looks in the list and on the campaign card: badge, sub-line, the main button and the «⋯» menu.
import type { BadgeTone, IconName } from '../../../design-system';
import type { Lang } from '../../../i18n/i18n';
import { formatDayMonth } from '../../../lib/format';
import { STATUS_TONE, statusLabelKey } from '../../campaignStatus';
import { CABINET_LINKS } from '../../sections';
import type { CampaignCard, CampaignStage, StageKind } from '../types';

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

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** The line under the badge: what happens now or since when. */
export function stageNote(stage: CampaignStage, t: Translate, lang: Lang): string | null {
  switch (stage.kind) {
    case 'review':
      return t('campaigns.row.note.review');
    case 'changesReview':
      return t('campaigns.row.note.changes');
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

export type CampaignActionKind = 'open' | 'howToPay' | 'fix' | 'edit' | 'topUp' | 'stats' | 'repeat';

export interface CampaignAction {
  kind: CampaignActionKind;
  labelKey: string;
  to: string;
  icon: IconName;
}

export function campaignAction(kind: CampaignActionKind, id: string): CampaignAction {
  switch (kind) {
    case 'open':
      return { kind, labelKey: 'campaigns.row.actions.open', to: CABINET_LINKS.campaign(id), icon: 'arrow-right' };
    case 'howToPay':
      return { kind, labelKey: 'campaigns.row.actions.howToPay', to: CABINET_LINKS.campaign(id), icon: 'receipt' };
    case 'fix':
      return { kind, labelKey: 'campaigns.row.actions.fix', to: CABINET_LINKS.campaignEdit(id), icon: 'pencil' };
    case 'edit':
      return { kind, labelKey: 'campaigns.row.actions.edit', to: CABINET_LINKS.campaignEdit(id), icon: 'pencil' };
    case 'topUp':
      return { kind, labelKey: 'campaigns.row.actions.topUp', to: CABINET_LINKS.campaignTopUp(id), icon: 'wallet' };
    case 'stats':
      return { kind, labelKey: 'campaigns.row.actions.stats', to: CABINET_LINKS.campaignStats(id), icon: 'chart' };
    case 'repeat':
      return { kind, labelKey: 'campaigns.row.actions.repeat', to: CABINET_LINKS.campaignCopy(id), icon: 'copy' };
  }
}

/** The row button: what the advertiser most likely needs at this stage. */
export function mainActionKind({ stage, canTopUp }: Pick<CampaignCard, 'stage' | 'canTopUp'>): CampaignActionKind {
  switch (stage.kind) {
    case 'review':
    case 'changesReview':
      return 'open';
    case 'awaitingPayment':
      return 'howToPay';
    case 'rejected':
      return 'fix';
    case 'active':
      return stage.low && canTopUp ? 'topUp' : 'stats';
    case 'noBudget':
      return canTopUp ? 'topUp' : 'stats';
    case 'paused':
    case 'hoursEnded':
      return 'stats';
    case 'finished':
      return 'repeat';
  }
}

const LAUNCHED: StageKind[] = ['changesReview', 'active', 'paused', 'hoursEnded', 'noBudget', 'finished'];

/** Everything else the campaign allows, for the «⋯» menu; `except` are the actions already shown as buttons. */
export function moreActionKinds(card: Pick<CampaignCard, 'stage' | 'canEdit' | 'canTopUp'>, except: CampaignActionKind[]): CampaignActionKind[] {
  const kinds: CampaignActionKind[] = [];
  if (LAUNCHED.includes(card.stage.kind)) kinds.push('stats');
  if (card.canEdit && card.stage.kind !== 'rejected') kinds.push('edit');
  if (card.canTopUp) kinds.push('topUp');
  if (card.stage.kind !== 'finished') kinds.push('repeat');
  return kinds.filter((kind) => !except.includes(kind));
}
