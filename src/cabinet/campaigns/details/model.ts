import { shiftDate, todayInAlmaty } from '../../../lib/dates';
import { budgetFigures } from '../../campaignBudget';
import { storesOf } from '../../stores';
import { TARIFFS } from '../../tariffs';
import { campaignAbilities, coverTone, stageOf, tariffOf } from '../model';
import type { StoreCatalog } from '../wizard/types';
import type { CampaignDetails, CampaignDetailsSource, ChartBucket, DetailsStats, DetailsStore, HistoryEvent } from './types';

const STATS_DAYS = 30;
/** Longer runs are drawn by weeks so the columns stay readable. */
const MAX_DAILY_COLUMNS = 31;
/** «Хватит примерно на N дней» uses the average of the last two weeks. */
const PACE_DAYS = 14;

function playsBetween(source: CampaignDetailsSource, from: string, to: string): number {
  return source.dailyPlays.reduce((sum, row) => (row.play_date && row.play_date >= from && row.play_date <= to ? sum + (row.plays ?? 0) : sum), 0);
}

function daysFrom(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = shiftDate(day, 1)) days.push(day);
  return days;
}

function buckets(source: CampaignDetailsSource, from: string, to: string): ChartBucket[] {
  const days = daysFrom(from, to);
  const size = days.length > MAX_DAILY_COLUMNS ? 7 : 1;
  const result: ChartBucket[] = [];
  for (let i = 0; i < days.length; i += size) {
    const last = days[Math.min(i + size, days.length) - 1];
    result.push({ from: days[i], to: last, plays: playsBetween(source, days[i], last) });
  }
  return result;
}

/** Calendar day in Almaty of a backend timestamp. */
const almatyDay = (timestamp: string): string => todayInAlmaty(new Date(timestamp));

function statsOf(source: CampaignDetailsSource): DetailsStats | null {
  const row = source.campaign;
  if (!row.start_date) return null;
  const spent = row.spent_budget ?? 0;
  const plays = row.plays_count ?? row.total_plays ?? 0;
  const common = { spent, pricePerPlay: plays > 0 ? spent / plays : row.price_per_play, carts: row.cart_count };
  if (row.status === 'completed') {
    const to = row.end_date ? almatyDay(row.end_date) : source.today;
    return { ...common, finished: true, plays: row.total_plays ?? 0, delta: null, buckets: buckets(source, almatyDay(row.start_date), to) };
  }
  const from = shiftDate(source.today, -(STATS_DAYS - 1));
  const recent = playsBetween(source, from, source.today);
  const before = playsBetween(source, shiftDate(from, -STATS_DAYS), shiftDate(from, -1));
  return { ...common, finished: false, plays: recent, delta: before > 0 ? recent / before - 1 : null, buckets: buckets(source, from, source.today) };
}

/** Stores of the campaign with their address, carts and the chosen shelf zones. «Все магазины» stands for every store. */
function storesOfCampaign(source: CampaignDetailsSource, catalog: StoreCatalog): DetailsStore[] {
  const linked = source.locations.filter((location) => location.kind === 'store' && location.location_id);
  // Stores that left the catalog are still shown, by the name the campaign keeps.
  const known = [
    ...catalog.stores,
    ...linked.flatMap((location) =>
      location.location_id && !catalog.stores.some((store) => store.id === location.location_id)
        ? [{ id: location.location_id, name: location.location_name ?? '', address: null, city: null, carts: null, activeCampaigns: null }]
        : [],
    ),
  ];
  const zones = source.locations.filter((location) => location.kind === 'zone');
  return storesOf(
    linked.map((location) => location.location_id),
    known,
  ).map((store) => ({
    id: store.id,
    name: store.name,
    address: [store.address, store.city].filter(Boolean).join(', ') || null,
    carts: store.carts,
    zones: zones.flatMap((zone) => (zone.parent_store_id === store.id && zone.location_name ? [zone.location_name] : [])),
  }));
}

/** Average spend per day over the last two weeks; null when the campaign hasn't played lately. */
export function dailySpend(source: CampaignDetailsSource): number | null {
  const row = source.campaign;
  const plays = row.plays_count ?? row.total_plays ?? 0;
  const price = plays > 0 ? (row.spent_budget ?? 0) / plays : row.price_per_play;
  if (!price) return null;
  const pace = (playsBetween(source, shiftDate(source.today, -(PACE_DAYS - 1)), source.today) / PACE_DAYS) * price;
  return pace > 0 ? pace : null;
}

/** «Хватит примерно на N дней» for `money` at the current pace. */
export function daysFor(money: number, spendPerDay: number | null): number | null {
  return spendPerDay && money > 0 ? Math.max(Math.ceil(money / spendPerDay), 1) : null;
}

// The backend keeps only the last submission and moderation, so repeated rounds and the day the budget ran out are lost
// (asked the backend for an event log). Events are sorted by date; an undated one stays where its neighbours put it.
function historyOf(source: CampaignDetailsSource, launched: boolean): HistoryEvent[] {
  const row = source.campaign;
  const events: Array<{ event: HistoryEvent; at: string }> = [];
  const add = (event: HistoryEvent, at: string | null) => {
    if (at) events.push({ event, at });
  };
  const created = row.created_at;
  const resubmitted = row.submitted_at && created && Date.parse(row.submitted_at) - Date.parse(created) > 60_000 ? row.submitted_at : null;

  add({ key: 'created', kind: 'created', date: created }, created);
  add({ key: 'sent', kind: 'sent', date: created, current: row.status === 'pending' && !resubmitted }, created);
  if (row.status === 'rejected') add({ key: 'rejected', kind: 'rejected', date: row.moderated_at, current: true }, row.moderated_at ?? resubmitted ?? created);
  else if (row.moderated_at && !(row.status === 'pending' && resubmitted)) add({ key: 'approved', kind: 'approved', date: row.moderated_at }, row.moderated_at);
  else if (launched) add({ key: 'approved', kind: 'approved', date: null }, row.start_date);
  for (const invoice of source.invoices) {
    if (invoice.status === 'paid') add({ key: invoice.id, kind: invoice.kind === 'topup' ? 'toppedUp' : 'paid', date: invoice.paid_at, amount: invoice.amount }, invoice.paid_at ?? invoice.issued_at);
    else if (invoice.status === 'unpaid' && invoice.kind === 'topup') add({ key: invoice.id, kind: 'invoice', date: invoice.issued_at, amount: invoice.amount, current: true }, invoice.issued_at);
  }
  add({ key: 'started', kind: 'started', date: row.start_date }, row.start_date);
  if (resubmitted && launched) add({ key: 'changesSent', kind: 'changesSent', date: resubmitted, current: row.status === 'pending' }, resubmitted);
  if (row.status === 'budget_ended') add({ key: 'budgetEnded', kind: 'budgetEnded', date: null }, `${source.today}T23:59:59+05:00`);
  if (row.status === 'completed') add({ key: 'finished', kind: 'finished', date: row.end_date }, row.end_date);

  // Array.prototype.sort is stable: events of the same moment keep the order they were added in.
  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map(({ event }) => event);
}

export function buildCampaignDetails(source: CampaignDetailsSource, catalog: StoreCatalog): CampaignDetails | null {
  const row = source.campaign;
  const money = budgetFigures(row);
  const stage = stageOf(row, money);
  if (!row.ad_id || !stage) return null;
  const tariff = tariffOf(row.tariff_code);
  const stats = statsOf(source);
  const stores = storesOfCampaign(source, catalog);
  const hasZones = TARIFFS.find((plan) => plan.code === tariff)?.hasZones ?? source.locations.some((location) => location.kind === 'zone');
  return {
    id: row.ad_id,
    name: row.title || row.name || '—',
    coverUrl: row.content_url || null,
    coverTone: coverTone(row.ad_id),
    tariff,
    hasZones,
    storesCount: stores.length || row.store_count,
    cartsCount: row.cart_count,
    createdAt: row.created_at,
    startDate: row.start_date,
    stage,
    ...campaignAbilities(row),
    stats,
    media: {
      video: source.files.video,
      durationSec: row.video_duration_sec,
      width: source.files.width,
      height: source.files.height,
      cover: row.content_url ? source.files.cover : null,
      description: row.description?.trim() ?? '',
    },
    stores,
    budget: {
      ...money,
      paid: row.paid_amount == null || !row.budget ? null : row.paid_amount >= row.budget,
      minTopUp: row.tariff_min_amount,
      daysLeft: row.status === 'active' ? daysFor(money.left, dailySpend(source)) : null,
    },
    history: historyOf(source, Boolean(row.start_date)),
    email: row.invoice_sent_to,
  };
}
