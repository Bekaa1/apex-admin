import { shiftDate } from '../../lib/dates';
import { budgetFigures } from '../campaignBudget';
import type { VisibleStatus } from '../campaignStatus';
import { playsByCampaign, totalPlays } from '../plays';
import { storesOf } from '../stores';
import type { CampaignAction, CampaignItem, CampaignStatsRow, HomeData, HomeSource } from './types';

export const HOME_CAMPAIGNS_LIMIT = 5;

type HomeStatus = Exclude<VisibleStatus, 'archived'>;
type HomeRow = CampaignStatsRow & { ad_id: string; status: HomeStatus };

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
  const money = budgetFigures(row);
  const played = plays.get(row.ad_id) ?? 0;
  return {
    id: row.ad_id,
    name: row.title || row.name || '—',
    tariff: extra?.tariff ?? null,
    coverUrl: extra?.content_url || null,
    status: row.status,
    budget: money.budget,
    left: money.left,
    spentPct: money.spentPct,
    lowBudget: money.low,
    budgetEnded: money.ended,
    plays7d: played === 0 && !row.total_plays ? null : played,
    action: actionFor(row.status, money.low || money.ended),
  };
}

function rank(item: CampaignItem): number {
  if (item.lowBudget || item.budgetEnded) return -1;
  return GROUP_ORDER.indexOf(item.status);
}

/** Earliest day of the two 7-day windows Home compares; the API asks for plays since this day. */
export function playsSince(today: string): string {
  return shiftDate(today, -13);
}

export function buildHomeData(source: HomeSource): HomeData {
  const weekStart = shiftDate(source.today, -6);
  const plays = playsByCampaign(source.dailyPlays, weekStart, source.today);
  const prevWeek = totalPlays(playsByCampaign(source.dailyPlays, playsSince(source.today), shiftDate(weekStart, -1)));

  const items = source.campaigns
    .filter(isHomeRow)
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .map((row) => toItem(row, plays, source));

  const active = items.filter((i) => i.status === 'active');
  const stores = storesOf(
    active.map((i) => source.extras.find((e) => e.id === i.id)?.store_id),
    source.stores,
  );
  const week = totalPlays(plays);
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
