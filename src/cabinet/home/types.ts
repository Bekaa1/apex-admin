// Shapes of the Supabase advertiser views used on Home. Replace with database.types.ts once it is generated.
import type { CampaignStatus, VisibleStatus } from '../campaignStatus';

/** `my_campaigns_stats` (filtered by auth.uid() in the view). */
export interface CampaignStatsRow {
  ad_id: string | null;
  title: string | null;
  name: string | null;
  status: CampaignStatus | null;
  budget: number | null;
  spent_budget: number | null;
  remaining_budget: number | null;
  total_plays: number | null;
  created_at: string | null;
}

/** `my_ad_stats_summary`. */
export interface PlaysSummaryRow {
  plays_week: number | null;
  plays_prev_week: number | null;
}

/** `my_daily_plays_by_campaign`, already limited to the last 7 days. */
export interface DailyPlaysRow {
  ad_id: string | null;
  plays: number | null;
}

/** `ads` columns the views lack; `tariff` arrives when the backend links campaigns to tariffs. */
export interface CampaignExtraRow {
  id: string;
  content_url: string | null;
  store_id: string | null;
  tariff?: string | null;
}

/** `stores`. */
export interface StoreRow {
  id: string;
  name: string;
  city: string | null;
}

export interface HomeSource {
  campaigns: CampaignStatsRow[];
  summary: PlaysSummaryRow | null;
  dailyPlays: DailyPlaysRow[];
  extras: CampaignExtraRow[];
  stores: StoreRow[];
}

export type CampaignAction = 'topUp' | 'stats' | 'open';

export interface CampaignItem {
  id: string;
  name: string;
  tariff: string | null;
  coverUrl: string | null;
  status: VisibleStatus;
  budget: number;
  left: number;
  spentPct: number;
  /** Budget share left ≤ LOW_BUDGET_SHARE while the campaign runs. */
  lowBudget: boolean;
  /** Budget ran out (status or nothing left). */
  budgetEnded: boolean;
  /** null — impressions have not started yet. */
  plays7d: number | null;
  action: CampaignAction;
}

export interface HomeData {
  isNew: boolean;
  activeCount: number;
  totalCount: number;
  plays7d: number;
  /** Change vs the previous 7 days as a fraction; null when there is nothing to compare with. */
  playsDelta: number | null;
  budgetLeft: number;
  storesCount: number;
  cities: string[];
  campaigns: CampaignItem[];
  /** The active campaign with the smallest share of budget left, if it is ≤ the low-budget threshold. */
  lowBudget: CampaignItem | null;
}

export type HomeState = { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; data: HomeData };
