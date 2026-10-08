import { budgetFigures, type BudgetFigures } from '../../campaignBudget';
import { coverTone } from '../../campaignCover';
import { campaignAbilities, isExtendableStatus, stageOf, type CampaignStage } from '../../campaignStage';
import { tariffOf, type TariffCode } from '../../tariffs';
import { dailySpend } from '../details/model';
import type { CampaignDetailsSource } from '../details/types';

/** Why a campaign can't be topped up: its status, or its plan is no longer sold. */
export type TopUpBlock = 'status' | 'tariff';

export interface TopUpTerms {
  /** The plan's price of a play now: the new invoice and its budget portion get it. */
  pricePerPlay: number;
  /** The plan's minimum top-up now. */
  minimum: number;
  /** Sent with `extend_campaign`: the server refuses if the terms changed after the screen was opened. */
  version: number;
  /** The terms version changed since the advertiser's last invoice: they must agree before a new one. */
  changed: boolean;
  /** The price of a play in the last invoice, when it differs from today's. */
  previousPrice: number | null;
  /** The minimum of the last invoice; null while invoices don't keep it (asked the backend). */
  previousMinimum: number | null;
  changedAt: string | null;
}

export interface TopUpCampaign {
  id: string;
  name: string;
  coverUrl: string | null;
  videoUrl: string | null;
  coverTone: 1 | 2 | 3;
  tariff: TariffCode | 'corporate' | null;
  storesCount: number | null;
  stage: CampaignStage;
  money: BudgetFigures;
  spendPerDay: number | null;
  /** Where the invoice goes; the backend takes the profile email. */
  email: string | null;
}

export type TopUpModel = { status: 'blocked'; reason: TopUpBlock; campaign: TopUpCampaign } | { status: 'ready'; campaign: TopUpCampaign; terms: TopUpTerms };

// The terms the advertiser agreed to are those of their last invoice that wasn't cancelled: it keeps the version and the
// price of a play. The backend bumps the version on any change of the plan, so that is what decides «changed».
function termsOf(source: CampaignDetailsSource, current: { pricePerPlay: number; minimum: number; version: number }): TopUpTerms {
  const agreed = source.invoices.filter((invoice) => invoice.status !== 'cancelled').at(-1);
  const changed = agreed?.tariff_version != null && agreed.tariff_version !== current.version;
  return {
    ...current,
    changed,
    previousPrice: changed && agreed.price_per_play !== null && agreed.price_per_play !== current.pricePerPlay ? agreed.price_per_play : null,
    previousMinimum: null,
    changedAt: source.tariffChangedAt,
  };
}

export function buildTopUp(source: CampaignDetailsSource): TopUpModel | null {
  const row = source.campaign;
  const money = budgetFigures(row);
  const stage = stageOf(row, money);
  if (!row.ad_id || !stage) return null;
  const campaign: TopUpCampaign = {
    id: row.ad_id,
    name: row.title || row.name || '—',
    coverUrl: row.content_url || null,
    videoUrl: row.video_url || null,
    coverTone: coverTone(row.ad_id),
    tariff: tariffOf(row.tariff_code),
    storesCount: row.store_count,
    stage,
    money,
    spendPerDay: dailySpend(source),
    email: row.invoice_sent_to,
  };
  const { tariff_min_amount: minimum, tariff_version: version, tariff_current_price: pricePerPlay } = row;
  if (!campaignAbilities(row).canTopUp || minimum === null || version === null || pricePerPlay === null) {
    return { status: 'blocked', reason: isExtendableStatus(row.status) ? 'tariff' : 'status', campaign };
  }
  return { status: 'ready', campaign, terms: termsOf(source, { pricePerPlay, minimum, version }) };
}
