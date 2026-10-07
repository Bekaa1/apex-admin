import { shiftDate } from '../../lib/dates';
import { budgetFigures, type BudgetFigures } from '../campaignBudget';
import { playsByCampaign } from '../plays';
import { storesOf } from '../stores';
import { TARIFFS, type TariffCode } from '../tariffs';
import type { CampaignAdRow, CampaignCard, CampaignStage, CampaignStatsRow, CampaignTab, CampaignsSource, StageKind, StoreRow } from './types';

/** First day of the 30-day play window; the API reads daily plays since this day. */
export function monthStart(today: string): string {
  return shiftDate(today, -29);
}

/** `null` while the backend doesn't report payments. */
function paidState(row: CampaignStatsRow): boolean | null {
  if (row.paid_amount == null || !row.budget) return null;
  return row.paid_amount >= row.budget;
}

function stageOf(row: CampaignStatsRow, money: BudgetFigures): CampaignStage | null {
  switch (row.status) {
    case 'pending':
      return { kind: 'review', paid: paidState(row) };
    case 'awaiting_payment':
      return {
        kind: 'awaitingPayment',
        invoice: row.invoice_amount != null && row.invoice_sent_to ? { amount: row.invoice_amount, sentTo: row.invoice_sent_to } : null,
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
      return money.ended ? { kind: 'noBudget' } : { kind: 'paused', since: row.start_date };
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

const LAUNCHED: StageKind[] = ['active', 'paused', 'hoursEnded', 'noBudget', 'finished'];

const TAB_OF: Record<StageKind, Exclude<CampaignTab, 'all'>> = {
  review: 'review',
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

const COVER_TONES = [1, 2, 3] as const;

function coverTone(id: string): 1 | 2 | 3 {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return COVER_TONES[sum % COVER_TONES.length];
}

function tariffOf(code: string | null | undefined): TariffCode | 'corporate' | null {
  if (code === 'corporate') return code;
  return TARIFFS.find((tariff) => tariff.code === code)?.code ?? null;
}

function storesCount(row: CampaignStatsRow, ad: CampaignAdRow | undefined, stores: StoreRow[]): number | null {
  if (row.store_count != null) return row.store_count;
  return ad?.store_id ? storesOf([ad.store_id], stores).length : null;
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
    const ad = source.ads.find((a) => a.id === id);
    const played = LAUNCHED.includes(stage.kind) && (row.total_plays ?? 0) > 0;
    cards.push({
      id,
      name: row.title || row.name || '—',
      coverUrl: ad?.content_url || null,
      coverTone: coverTone(id),
      tariff: tariffOf(row.tariff_code),
      storesCount: storesCount(row, ad, source.stores),
      cartsCount: row.cart_count ?? null,
      createdAt: row.created_at ?? '',
      stage,
      budget: money,
      plays: played ? { week: week.get(id) ?? 0, month: month.get(id) ?? 0, all: row.total_plays ?? 0 } : null,
    });
  }
  return cards;
}
