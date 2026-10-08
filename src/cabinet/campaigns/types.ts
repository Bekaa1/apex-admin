// Rows the campaigns list reads from Supabase and the cards it shows.
import type { Database } from '../../lib/database.types';
import type { BudgetFigures } from '../campaignBudget';
import type { CampaignStage } from '../campaignStage';
import type { DailyPlaysRow } from '../plays';
import type { TariffCode } from '../tariffs';

export type { CampaignStage, Moderation, StageKind } from '../campaignStage';

type StatsView = Database['public']['Views']['my_campaigns_stats']['Row'];

/** `my_campaigns_stats` (filtered by auth.uid() in the view). */
export type CampaignStatsRow = Pick<
  StatsView,
  | 'ad_id'
  | 'title'
  | 'name'
  | 'status'
  | 'budget'
  | 'spent_budget'
  | 'remaining_budget'
  | 'total_plays'
  | 'start_date'
  | 'end_date'
  | 'created_at'
  | 'tariff_code'
  | 'store_count'
  | 'cart_count'
  | 'content_url'
  | 'paid_amount'
  | 'unpaid_amount'
  | 'invoice_sent_to'
  | 'rejection_reasons'
  | 'moderator_comment'
  | 'submitted_at'
  | 'tariff_can_extend'
>;

export interface CampaignsSource {
  /** YYYY-MM-DD in Almaty; play windows end on this day. */
  today: string;
  campaigns: CampaignStatsRow[];
  /** The last 30 days. */
  dailyPlays: DailyPlaysRow[];
}

export type PlaysPeriod = 'week' | 'month' | 'all';
export type CampaignTab = 'all' | 'running' | 'review' | 'finished';
export type CampaignSort = 'new' | 'budgetLeft' | 'shows' | 'name';

export interface CampaignCard {
  id: string;
  name: string;
  coverUrl: string | null;
  /** Placeholder gradient 1–3, picked from the id so it stays put while filtering. */
  coverTone: 1 | 2 | 3;
  /** Name in `cabinet.tariffs.<code>.name`. */
  tariff: TariffCode | 'corporate' | null;
  storesCount: number | null;
  cartsCount: number | null;
  createdAt: string;
  stage: CampaignStage;
  /** The backend accepts `edit_campaign` in this status. */
  canEdit: boolean;
  /** The backend accepts `extend_campaign`: the campaign runs or ran out of money, and its plan is still sold. */
  canTopUp: boolean;
  budget: BudgetFigures;
  /** null — impressions have not started yet. */
  plays: Record<PlaysPeriod, number> | null;
}

export type CampaignsListState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; cards: CampaignCard[] };
