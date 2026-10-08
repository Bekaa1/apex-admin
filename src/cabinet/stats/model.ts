// «Статистика»: from the backend rows and the filters to what the page shows.
import { campaignAbilities } from '../campaignStage';
import { playsByCampaign } from '../plays';
import { buildChart } from './buckets';
import { buildHeatmap } from './heatmap';
import { campaignLines, cartsSummary, storeLines, storesOfChosen, zonesSummary, type CampaignPlays } from './lines';
import { inRange } from './period';
import type { Chosen, StatsSelection } from './selection';
import type { CampaignHead, CartsFigure, CartsSummary, StatsFilters, StatsKpis, StatsMeta, StatsRangeSource, StatsSource, StatsView } from './types';

function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

/** Change of a total, shown only when the previous period had some. */
function totalChange(current: number, previous: number | null): number | null {
  return previous ? current / previous - 1 : null;
}

function headOf(source: StatsSource, single: Chosen): CampaignHead {
  return {
    id: single.id,
    name: single.name,
    coverUrl: single.row.content_url || null,
    videoUrl: single.row.video_url || null,
    coverTone: single.coverTone,
    tariff: single.tariff,
    stage: single.stage,
    stores: storesOfChosen(source, new Set([single.id])).length || single.row.store_count,
    carts: single.row.cart_count,
    budget: single.money,
    canTopUp: campaignAbilities(single.row).canTopUp,
  };
}

function cartsFigure(selection: StatsSelection, summary: CartsSummary | null, storesCarts: number): CartsFigure | null {
  const { single, chosen } = selection;
  if (chosen.every((c) => c.stage.kind === 'finished')) {
    const total = single ? single.row.cart_count : storesCarts;
    return total ? { kind: 'total', total } : null;
  }
  if (single) return single.row.cart_count ? { kind: 'online', online: single.row.online_cart_count ?? 0, total: single.row.cart_count } : null;
  return summary ? { kind: 'online', online: summary.online, total: summary.total } : null;
}

export function buildStatsView(source: StatsSource, range: StatsRangeSource, selection: StatsSelection, filters: StatsFilters): StatsView {
  const { single, chosen, ids, period, compare, chartRange } = selection;
  const view = { filters, options: selection.options, period, head: single ? headOf(source, single) : null };
  if (!selection.hasLaunched) return { ...view, head: null, body: { kind: 'empty', waiting: selection.waiting } };

  const plays: CampaignPlays = {
    current: playsByCampaign(source.dailyPlays, selection.range.from, selection.range.to),
    previous: compare ? playsByCampaign(source.dailyPlays, compare.from, compare.to) : null,
  };
  const total = sum(chosen, (c) => plays.current.get(c.id) ?? 0);
  const previousTotal = plays.previous ? sum(chosen, (c) => plays.previous?.get(c.id) ?? 0) : null;
  const meta: StatsMeta = { period, range: selection.range, compare, noComparison: compare !== null && previousTotal === 0, syncedAt: source.syncedAt };
  // Nothing to compare when nothing played: the meta line shows only the dates, as drawn.
  if (total === 0) return { ...view, body: { kind: 'noPlays', meta: { ...meta, compare: null }, scope: filters.scope } };

  // Spend per play is not stored, so a period costs its plays at the campaign price (exact while a campaign has one price);
  // «Всё время» takes the exact total the backend counts.
  const spentOf = (c: Chosen, count: number) => (period === 'all' ? (c.row.spent_budget ?? 0) : count * (c.row.price_per_play ?? 0));
  const spent = sum(chosen, (c) => spentOf(c, plays.current.get(c.id) ?? 0));
  const previousSpent = plays.previous ? sum(chosen, (c) => (plays.previous?.get(c.id) ?? 0) * (c.row.price_per_play ?? 0)) : null;
  const price = spent / total;
  const previousPrice = previousTotal && previousSpent !== null ? previousSpent / previousTotal : null;

  const perDay = new Map<string, number>();
  const perCampaignDay = new Map<string, number>();
  for (const row of source.dailyPlays) {
    if (!row.ad_id || !row.play_date || !ids.has(row.ad_id) || !inRange(row.play_date, chartRange)) continue;
    perDay.set(row.play_date, (perDay.get(row.play_date) ?? 0) + (row.plays ?? 0));
    perCampaignDay.set(`${row.ad_id}:${row.play_date}`, row.plays ?? 0);
  }
  const dayPlays = (id: string, day: string) => perCampaignDay.get(`${id}:${day}`) ?? 0;
  // Without plays in the previous period every line would be «новая»: nothing is compared then.
  const compared = meta.noComparison ? null : compare;

  // Carts are about now: stores of finished campaigns count only while the period shows their plays.
  const stores = storesOfChosen(source, ids);
  const allFinished = chosen.every((c) => c.stage.kind === 'finished');
  const showing = new Set(chosen.filter((c) => c.stage.kind !== 'finished' || (plays.current.get(c.id) ?? 0) > 0).map((c) => c.id));
  const carts = allFinished ? null : cartsSummary(source, storesOfChosen(source, showing), range.worked);
  const kpis: StatsKpis = {
    plays: total,
    playsChange: totalChange(total, previousTotal),
    spent,
    spentChange: totalChange(spent, previousSpent),
    price,
    priceChange: previousPrice ? price / previousPrice - 1 : null,
    carts: cartsFigure(selection, carts, sum(stores, (store) => store.carts ?? 0)),
  };

  return {
    ...view,
    body: {
      kind: 'report',
      meta,
      kpis,
      chart: buildChart(perDay, chartRange, selection.step),
      campaigns: single ? null : campaignLines(chosen, { current: plays.current, previous: compared ? plays.previous : null }, dayPlays, chartRange, spentOf),
      stores: source.storePlays ? storeLines(source, source.storePlays, ids, selection.range, compared) : null,
      carts,
      zones: source.zonePlays ? zonesSummary(source.locations, source.zonePlays, ids, total, selection.range, compared) : null,
      hours: range.hours ? buildHeatmap(range.hours, chartRange) : null,
    },
  };
}
