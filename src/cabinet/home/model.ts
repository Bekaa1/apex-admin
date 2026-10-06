import type { VisibleStatus } from '../campaignStatus';
import type { CampaignAction, CampaignItem, CampaignStatsRow, HomeData, HomeSource, StoreRow } from './types';

/** Budget is «almost spent» when this share or less is left. */
export const LOW_BUDGET_SHARE = 0.15;
export const HOME_CAMPAIGNS_LIMIT = 5;
/** Placeholder store the backend assigns to campaigns that run everywhere. */
const ALL_STORES_NAME = 'Все магазины';

type HomeStatus = Exclude<VisibleStatus, 'archived'>;
type HomeRow = CampaignStatsRow & { ad_id: string; status: HomeStatus };

const RUNNING: HomeStatus[] = ['active', 'paused'];
const NOT_STARTED: HomeStatus[] = ['pending', 'draft', 'rejected'];
const GROUP_ORDER: VisibleStatus[] = ['active', 'pending', 'rejected', 'paused', 'hours_ended', 'draft', 'budget_ended', 'completed'];

function isHomeRow(row: CampaignStatsRow): row is HomeRow {
  return Boolean(row.ad_id) && row.status !== null && row.status !== 'deleted' && row.status !== 'archived';
}

function actionFor(status: HomeStatus, needsMoney: boolean): CampaignAction {
  if (needsMoney) return 'topUp';
  return NOT_STARTED.includes(status) ? 'open' : 'stats';
}

function toItem(row: HomeRow, plays: Map<string, number>, source: HomeSource): CampaignItem {
  const extra = source.extras.find((e) => e.id === row.ad_id);
  const budget = row.budget ?? 0;
  const spent = row.spent_budget ?? 0;
  const left = Math.max(row.remaining_budget ?? budget - spent, 0);
  const running = RUNNING.includes(row.status);
  const budgetEnded = row.status === 'budget_ended' || (running && budget > 0 && left === 0);
  const lowBudget = !budgetEnded && running && budget > 0 && left / budget <= LOW_BUDGET_SHARE;
  const played = plays.get(row.ad_id) ?? 0;
  return {
    id: row.ad_id,
    name: row.title || row.name || '—',
    tariff: extra?.tariff ?? null,
    coverUrl: extra?.content_url || null,
    status: row.status,
    budget,
    left,
    spentPct: budget > 0 ? Math.min((spent / budget) * 100, 100) : 0,
    lowBudget,
    budgetEnded,
    plays7d: played === 0 && !row.total_plays ? null : played,
    action: actionFor(row.status, lowBudget || budgetEnded),
  };
}

function rank(item: CampaignItem): number {
  if (item.lowBudget || item.budgetEnded) return -1;
  return GROUP_ORDER.indexOf(item.status);
}

/** Stores where active campaigns run; «Все магазины» stands for every real store. */
function storesOf(active: CampaignItem[], source: HomeSource): StoreRow[] {
  const real = source.stores.filter((s) => s.name !== ALL_STORES_NAME);
  const ids = new Set(active.map((i) => source.extras.find((e) => e.id === i.id)?.store_id));
  const everywhere = source.stores.some((s) => s.name === ALL_STORES_NAME && ids.has(s.id));
  return everywhere ? real : real.filter((s) => ids.has(s.id));
}

export function buildHomeData(source: HomeSource): HomeData {
  const plays = new Map<string, number>();
  for (const row of source.dailyPlays) {
    if (row.ad_id) plays.set(row.ad_id, (plays.get(row.ad_id) ?? 0) + (row.plays ?? 0));
  }

  const items = source.campaigns
    .filter(isHomeRow)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .map((row) => toItem(row, plays, source));

  const active = items.filter((i) => i.status === 'active');
  const stores = storesOf(active, source);
  const week = source.summary?.plays_week ?? [...plays.values()].reduce((sum, n) => sum + n, 0);
  const prevWeek = source.summary?.plays_prev_week ?? 0;
  const lowBudget = active.filter((i) => i.lowBudget).sort((a, b) => a.left / a.budget - b.left / b.budget)[0] ?? null;

  return {
    isNew: items.length === 0,
    activeCount: active.length,
    totalCount: items.length,
    plays7d: week,
    playsDelta: prevWeek > 0 ? (week - prevWeek) / prevWeek : null,
    budgetLeft: items.reduce((sum, i) => sum + i.left, 0),
    storesCount: stores.length,
    cities: [...new Set(stores.map((s) => s.city).filter((c): c is string => Boolean(c)))].sort(),
    campaigns: [...items].sort((a, b) => rank(a) - rank(b)).slice(0, HOME_CAMPAIGNS_LIMIT),
    lowBudget,
  };
}
