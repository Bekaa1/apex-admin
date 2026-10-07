// Rows Home reads from Supabase, picked from the generated database types.
import type { Database, Tables } from '../../lib/database.types';
import type { VisibleStatus } from '../campaignStatus';
import type { DailyPlaysRow } from '../plays';

type Views = Database['public']['Views'];

/** `my_campaigns_stats` (filtered by auth.uid() in the view). */
export type CampaignStatsRow = Pick<
  Views['my_campaigns_stats']['Row'],
  'ad_id' | 'title' | 'name' | 'status' | 'budget' | 'spent_budget' | 'remaining_budget' | 'total_plays' | 'created_at'
>;

/** `ads` columns the views lack; `tariff` arrives when the backend links campaigns to tariffs. */
export type CampaignExtraRow = Pick<Tables<'ads'>, 'id' | 'content_url' | 'store_id'> & { tariff?: string | null };

/** `stores`. */
export type StoreRow = Pick<Tables<'stores'>, 'id' | 'name' | 'city'>;

export interface HomeSource {
  /** YYYY-MM-DD in Almaty; the 7-day windows end on this day. */
  today: string;
  campaigns: CampaignStatsRow[];
  /** Last 14 days: this week and the one before. */
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
  /** Budget share left ≤ LOW_BUDGET_SHARE (campaignBudget.ts) while the campaign runs. */
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
  /** Change vs the 7 days before as a fraction; null when there is nothing to compare with. */
  playsDelta: number | null;
  budgetLeft: number;
  storesCount: number;
  cities: string[];
  campaigns: CampaignItem[];
  /** The active campaign with the smallest share of budget left, if it is ≤ the low-budget threshold. */
  lowBudget: CampaignItem | null;
}

export type HomeState = { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; data: HomeData };
