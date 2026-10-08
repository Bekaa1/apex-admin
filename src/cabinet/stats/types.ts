// What «Статистика» reads and what it shows.
import type { HeatmapLevel } from '../../design-system';
import type { Database } from '../../lib/database.types';
import type { BudgetFigures } from '../campaignBudget';
import type { CoverTone } from '../campaignCover';
import type { CampaignStage } from '../campaignStage';
import type { ChartStep, PlaysBucket } from '../charts';
import type { DailyPlaysRow } from '../plays';
import type { TariffCode } from '../tariffs';

type Views = Database['public']['Views'];

/** `my_campaigns_stats`: one row per own campaign. */
export type StatsCampaignRow = Pick<
  Views['my_campaigns_stats']['Row'],
  | 'ad_id'
  | 'title'
  | 'name'
  | 'status'
  | 'start_date'
  | 'end_date'
  | 'submitted_at'
  | 'budget'
  | 'spent_budget'
  | 'remaining_budget'
  | 'paid_amount'
  | 'unpaid_amount'
  | 'invoice_sent_to'
  | 'rejection_reasons'
  | 'moderator_comment'
  | 'price_per_play'
  | 'tariff_code'
  | 'tariff_can_extend'
  | 'store_count'
  | 'cart_count'
  | 'online_cart_count'
  | 'content_url'
  | 'video_url'
  | 'paused_at'
  | 'paused_by'
>;

/** `my_campaign_locations`: stores and shelf zones chosen in a campaign. */
export type StatsLocationRow = Pick<Views['my_campaign_locations']['Row'], 'ad_id' | 'kind' | 'location_id' | 'location_name' | 'parent_store_id'>;

/** A real store from `catalog_stores()`. */
export interface StatsStore {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  carts: number | null;
}

/** Plays of a campaign in a store or a chosen shelf zone on a day (Almaty). */
export interface PlaceDayPlays {
  campaignId: string;
  placeId: string;
  day: string;
  plays: number;
}

export interface HourPlays {
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  hour: number;
  plays: number;
}

export interface StoreCarts {
  storeId: string;
  carts: number;
  /** Carts that showed any video in the last hour. */
  online: number;
}

/** Carts of a store that showed the advertiser's videos in a period. */
export interface StoreWorkedCarts {
  storeId: string;
  carts: number;
}

/**
 * Everything the page needs. `null` parts wait for backend views (requested 07.10, see session-log); their blocks are hidden.
 */
export interface StatsSource {
  /** YYYY-MM-DD in Almaty. */
  today: string;
  campaigns: StatsCampaignRow[];
  dailyPlays: DailyPlaysRow[];
  locations: StatsLocationRow[];
  stores: StatsStore[];
  storePlays: PlaceDayPlays[] | null;
  zonePlays: PlaceDayPlays[] | null;
  cartsNow: StoreCarts[] | null;
  syncedAt: string | null;
}

/** Data the backend counts for the chosen dates. */
export interface StatsRangeSource {
  hours: HourPlays[] | null;
  worked: { current: StoreWorkedCarts[]; previous: StoreWorkedCarts[] | null } | null;
}

export type StatsPeriod = '7d' | '30d' | '90d' | 'all';
export type StatsScope = 'all' | 'running' | 'finished';

/** Filters in the URL; `null` — not chosen, the page picks the default. */
export interface StatsFilters {
  campaignId: string | null;
  period: StatsPeriod | null;
  scope: StatsScope;
  step: ChartStep | null;
}

/** YYYY-MM-DD, both ends included. */
export interface DateRange {
  from: string;
  to: string;
}

/** vs the previous period: a fraction, «новая» when there was nothing to compare with, or nothing to show. */
export type Change = number | 'new' | null;

export interface StatsOption {
  id: string;
  name: string;
}

export interface StatsMeta {
  period: StatsPeriod;
  range: DateRange;
  /** The previous period of the same length; null for «Всё время». */
  compare: DateRange | null;
  /** The previous period had no plays: deltas are hidden and the meta line says so. */
  noComparison: boolean;
  syncedAt: string | null;
}

export type CartsFigure = { kind: 'online'; online: number; total: number } | { kind: 'total'; total: number };

export interface StatsKpis {
  plays: number;
  playsChange: number | null;
  spent: number;
  spentChange: number | null;
  price: number | null;
  priceChange: number | null;
  carts: CartsFigure | null;
}

export interface StatsChart {
  step: ChartStep;
  buckets: PlaysBucket[];
  /** Per day, week or month, without partial columns; null when no column is full. */
  average: number | null;
  peak: PlaysBucket | null;
  hasPartial: boolean;
}

export interface CampaignLine {
  id: string;
  name: string;
  coverUrl: string | null;
  videoUrl: string | null;
  coverTone: CoverTone;
  tariff: TariffCode | 'corporate' | null;
  stage: CampaignStage;
  plays: number;
  change: Change;
  /** 0–1 of all plays in the table. */
  share: number;
  spent: number;
  price: number | null;
  /** Plays of the last days of the period, for the sparkline. */
  trend: number[];
}

export interface StoreLine {
  id: string;
  name: string;
  address: string | null;
  plays: number;
  change: Change;
  share: number;
  perCart: number | null;
  carts: { online: number; total: number } | null;
}

export interface CartsSummary {
  online: number;
  total: number;
  /** Share of carts that showed the advertiser's videos in the period, and its change. */
  worked: { share: number; change: number | null } | null;
  /** Up to three stores with the most carts offline now. */
  worst: { id: string; name: string; offline: number }[];
}

export interface ZoneLine {
  name: string;
  /** Stores where the zone is chosen. */
  stores: number;
  plays: number;
  change: Change;
}

export interface ZonesSummary {
  zones: number;
  rotation: number;
  lines: ZoneLine[];
}

export interface HeatmapData {
  hours: number[];
  rows: { weekday: number; cells: { hour: number; average: number; level: HeatmapLevel }[] }[];
  /** The two weekdays with the most plays, Monday first. */
  bestDays: number[];
  /** The busiest three hours in a row: [from, to). */
  bestHours: { from: number; to: number } | null;
}

export interface CampaignHead {
  id: string;
  name: string;
  coverUrl: string | null;
  videoUrl: string | null;
  coverTone: CoverTone;
  tariff: TariffCode | 'corporate' | null;
  stage: CampaignStage;
  stores: number | null;
  carts: number | null;
  budget: BudgetFigures;
  canTopUp: boolean;
}

export interface StatsReport {
  meta: StatsMeta;
  kpis: StatsKpis;
  chart: StatsChart;
  /** Overview only. */
  campaigns: CampaignLine[] | null;
  stores: StoreLine[] | null;
  carts: CartsSummary | null;
  zones: ZonesSummary | null;
  hours: HeatmapData | null;
}

/** The page below the filters. */
export type StatsBody =
  | { kind: 'empty'; waiting: number }
  | { kind: 'noPlays'; meta: StatsMeta; scope: StatsScope }
  | ({ kind: 'report' } & StatsReport);

export interface StatsView {
  filters: StatsFilters;
  options: StatsOption[];
  /** The counted period: the chosen one or the default. */
  period: StatsPeriod;
  /** Set when one campaign is chosen. */
  head: CampaignHead | null;
  body: StatsBody;
}

export type StatsState = { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; view: StatsView };
