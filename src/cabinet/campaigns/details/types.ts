// What the campaign card reads from Supabase and the view it shows.
import type { Database, Tables } from '../../../lib/database.types';
import type { BudgetFigures } from '../../campaignBudget';
import type { DailyPlaysRow } from '../../plays';
import type { TariffCode } from '../../tariffs';
import type { CampaignStage, CampaignStatsRow } from '../types';

type StatsView = Database['public']['Views']['my_campaigns_stats']['Row'];

/** `my_campaigns_stats`: the list row and what only the card needs. */
export type CampaignDetailsRow = CampaignStatsRow &
  Pick<
    StatsView,
    'moderated_at' | 'description' | 'video_url' | 'video_duration_sec' | 'price_per_play' | 'plays_count' | 'tariff_version' | 'tariff_min_amount' | 'tariff_current_price'
  >;

export type InvoiceRow = Pick<Tables<'advertiser_invoices'>, 'id' | 'kind' | 'amount' | 'status' | 'issued_at' | 'paid_at' | 'sent_to' | 'tariff_version' | 'price_per_play'>;

export type LocationRow = Pick<Database['public']['Views']['my_campaign_locations']['Row'], 'kind' | 'location_id' | 'location_name' | 'parent_store_id'>;

/** Original file names and the video frame size, from the campaign's own `ads` row. */
export interface CampaignFiles {
  video: string | null;
  width: number | null;
  height: number | null;
  cover: string | null;
}

export interface CampaignDetailsSource {
  /** YYYY-MM-DD in Almaty. */
  today: string;
  campaign: CampaignDetailsRow;
  files: CampaignFiles;
  locations: LocationRow[];
  /** Every day the campaign played. */
  dailyPlays: DailyPlaysRow[];
  /** Oldest first, cancelled ones included. */
  invoices: InvoiceRow[];
  /** When the plan's terms last changed (`tariffs.updated_at`). */
  tariffChangedAt: string | null;
}

export interface ChartBucket {
  /** YYYY-MM-DD: the day, or the first day of a week. */
  from: string;
  to: string;
  plays: number;
}

export interface DetailsStats {
  /** «Итоги кампании» instead of «Статистика за 30 дней». */
  finished: boolean;
  plays: number;
  /** Plays vs the 30 days before, as a fraction; null when there is nothing to compare with. */
  delta: number | null;
  spent: number;
  /** Average price of a play so far. */
  pricePerPlay: number | null;
  carts: number | null;
  buckets: ChartBucket[];
}

export interface DetailsStore {
  id: string;
  name: string;
  address: string | null;
  carts: number | null;
  zones: string[];
}

export type HistoryKind = 'created' | 'sent' | 'approved' | 'rejected' | 'paid' | 'toppedUp' | 'invoice' | 'started' | 'changesSent' | 'paused' | 'budgetEnded' | 'finished';

export interface HistoryEvent {
  key: string;
  kind: HistoryKind;
  /** null when the backend doesn't keep the date of this event. */
  date: string | null;
  amount?: number;
  /** What is happening now (the last step). */
  current?: boolean;
}

export interface CampaignDetails {
  id: string;
  name: string;
  coverUrl: string | null;
  coverTone: 1 | 2 | 3;
  tariff: TariffCode | 'corporate' | null;
  hasZones: boolean;
  storesCount: number | null;
  cartsCount: number | null;
  createdAt: string | null;
  /** First day of shows; null before the launch. */
  startDate: string | null;
  stage: CampaignStage;
  canEdit: boolean;
  canTopUp: boolean;
  stats: DetailsStats | null;
  media: { video: string | null; videoUrl: string | null; durationSec: number | null; width: number | null; height: number | null; cover: string | null; description: string };
  stores: DetailsStore[];
  budget: BudgetFigures & {
    /** Not launched yet: whether the budget is paid. */
    paid: boolean | null;
    minTopUp: number | null;
    /** What a play costs the campaign now (the price of its current budget portion). */
    pricePerPlay: number | null;
    daysLeft: number | null;
  };
  history: HistoryEvent[];
  /** Where invoices and moderation results go. */
  email: string | null;
}
