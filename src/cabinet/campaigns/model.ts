import { shiftDate } from '../../lib/dates';
import { budgetFigures } from '../campaignBudget';
import { coverTone } from '../campaignCover';
import { campaignAbilities, LAUNCHED_STAGES, stageOf, type StageKind } from '../campaignStage';
import { playsByCampaign } from '../plays';
import { tariffOf } from '../tariffs';
import type { CampaignCard, CampaignTab, CampaignsSource } from './types';

/** First day of the 30-day play window; the API reads daily plays since this day. */
export function monthStart(today: string): string {
  return shiftDate(today, -29);
}

const TAB_OF: Record<StageKind, Exclude<CampaignTab, 'all'>> = {
  review: 'review',
  changesReview: 'review',
  awaitingPayment: 'review',
  rejected: 'review',
  active: 'running',
  paused: 'running',
  hoursEnded: 'running',
  noBudget: 'running',
  finished: 'finished',
};

export function tabOf(card: CampaignCard): Exclude<CampaignTab, 'all'> {
  return TAB_OF[card.stage.kind];
}

export function buildCampaignCards(source: CampaignsSource): CampaignCard[] {
  const week = playsByCampaign(source.dailyPlays, shiftDate(source.today, -6), source.today);
  const month = playsByCampaign(source.dailyPlays, monthStart(source.today), source.today);
  const cards: CampaignCard[] = [];
  for (const row of source.campaigns) {
    if (!row.ad_id) continue;
    const money = budgetFigures(row);
    const stage = stageOf(row, money);
    if (!stage) continue;
    const id = row.ad_id;
    const played = LAUNCHED_STAGES.includes(stage.kind) && (row.total_plays ?? 0) > 0;
    cards.push({
      id,
      name: row.title || row.name || '—',
      coverUrl: row.content_url || null,
      coverTone: coverTone(id),
      tariff: tariffOf(row.tariff_code),
      storesCount: row.store_count,
      cartsCount: row.cart_count,
      createdAt: row.created_at ?? '',
      stage,
      ...campaignAbilities(row),
      budget: money,
      plays: played ? { week: week.get(id) ?? 0, month: month.get(id) ?? 0, all: row.total_plays ?? 0 } : null,
    });
  }
  return cards;
}
