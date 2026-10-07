// Rows the campaigns list reads from Supabase and the cards it shows.
import type { Database } from '../../lib/database.types';
import type { BudgetFigures } from '../campaignBudget';
import type { DailyPlaysRow } from '../plays';
import type { TariffCode } from '../tariffs';

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

export interface Moderation {
  /** Codes of the broken rules, texts in `campaigns.rules.*`. */
  rules: string[];
  comment: string | null;
}

/** Where the campaign is. `null` means the backend doesn't tell yet, and that part is not shown. */
export type CampaignStage =
  | { kind: 'review'; paid: boolean | null }
  | { kind: 'awaitingPayment'; invoice: { amount: number; sentTo: string } | null }
  | { kind: 'rejected'; paid: boolean | null; moderation: Moderation | null }
  | { kind: 'active'; since: string | null; low: boolean }
  | { kind: 'paused'; since: string | null }
  | { kind: 'hoursEnded' }
  | { kind: 'noBudget' }
  | { kind: 'finished'; from: string | null; to: string | null };

export type StageKind = CampaignStage['kind'];

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
  budget: BudgetFigures;
  /** null — impressions have not started yet. */
  plays: Record<PlaysPeriod, number> | null;
}

export type CampaignsListState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; cards: CampaignCard[] };
