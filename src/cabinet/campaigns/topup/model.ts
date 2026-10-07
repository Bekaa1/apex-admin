import { budgetFigures, type BudgetFigures } from '../../campaignBudget';
import type { TariffCode } from '../../tariffs';
import { dailySpend } from '../details/model';
import type { CampaignDetailsSource } from '../details/types';
import { campaignAbilities, coverTone, isExtendableStatus, stageOf, tariffOf } from '../model';
import type { CampaignStage } from '../types';

/** Why a campaign can't be topped up: its status, or its plan is no longer sold. */
export type TopUpBlock = 'status' | 'tariff';

export interface TopUpTerms {
  /** The plan's minimum top-up now. */
  minimum: number;
  /** Sent with `extend_campaign`: the server refuses if the terms changed after the screen was opened. */
  version: number;
  /** The terms changed since the advertiser's last invoice: they must agree before a new one. */
  changed: boolean;
  /** The minimum of the last invoice; null while invoices don't keep it. */
  previousMinimum: number | null;
  changedAt: string | null;
}

export interface TopUpCampaign {
  id: string;
  name: string;
  coverUrl: string | null;
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

// The terms the advertiser agreed to are those of their last invoice that wasn't cancelled. Invoices keep the terms
// version but not the minimum yet (asked the backend), so any change of the plan's terms counts until then.
function termsOf(source: CampaignDetailsSource, minimum: number, version: number): TopUpTerms {
  const agreed = source.invoices.filter((invoice) => invoice.status !== 'cancelled').at(-1);
  return {
    minimum,
    version,
    changed: agreed?.tariff_version != null && agreed.tariff_version !== version,
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
    coverTone: coverTone(row.ad_id),
    tariff: tariffOf(row.tariff_code),
    storesCount: row.store_count,
    stage,
    money,
    spendPerDay: dailySpend(source),
    email: row.invoice_sent_to,
  };
  if (!campaignAbilities(row).canTopUp || row.tariff_min_amount === null || row.tariff_version === null) {
    return { status: 'blocked', reason: isExtendableStatus(row.status) ? 'tariff' : 'status', campaign };
  }
  return { status: 'ready', campaign, terms: termsOf(source, row.tariff_min_amount, row.tariff_version) };
}
