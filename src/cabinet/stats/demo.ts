import { eachDay, isoWeekday } from '../../lib/dates';
import type { DemoVariant } from '../demo';
import { buildStatsView } from './model';
import { inRange } from './period';
import { selectStats, type StatsSelection } from './selection';
import type { PlaceDayPlays, StatsCampaignRow, StatsFilters, StatsLocationRow, StatsRangeSource, StatsSource, StatsState } from './types';

// Dev-only fixtures after the «Apex — Статистика» artboards. Built inside functions, so production builds drop them.

const TODAY = '2026-10-07';

// Name, address, city, carts, online now.
const STORES: Array<[string, string, string, number, number]> = [
  ['Dala Market', 'пр. аль-Фараби, 77', 'Алматы', 72, 70],
  ['Береке Маркет', 'ул. Розыбакиева, 247', 'Алматы', 48, 46],
  ['Береке Маркет', 'пр. Абая, 150', 'Алматы', 64, 61],
  ['Жұлдыз', 'ул. Сейфуллина, 534', 'Алматы', 52, 49],
  ['Арай Фуд', 'ул. Тимирязева, 42', 'Алматы', 40, 37],
  ['Жұлдыз', 'ул. Толе би, 286', 'Алматы', 30, 26],
  ['Береке Маркет', 'пр. Мангилик Ел, 37', 'Астана', 58, 52],
  ['Dala Market', 'пр. Туран, 24', 'Астана', 46, 44],
  ['Арай Фуд', 'ул. Жандосова, 58', 'Алматы', 36, 36],
  ['Жұлдыз', 'ул. Абылай хана, 12', 'Алматы', 34, 30],
];

interface DemoCampaign {
  id: string;
  title: string;
  tariff: 'standard' | 'zones' | 'premium';
  status: StatsCampaignRow['status'];
  start: string;
  /** Last day with plays. */
  end: string;
  finished: boolean;
  budget: number;
  spent: number;
  price: number;
  perDay: number;
  stores: number[];
  zones: string[];
  /** Share of plays at the chosen shelf zones. */
  atZones: number;
}

function demoCampaigns(): DemoCampaign[] {
  return [
    { id: 'demo-c1', title: 'Летний лимонад', tariff: 'zones', status: 'active', start: '2026-08-01', end: TODAY, finished: false, budget: 1_000_000, spent: 875_000, price: 9.95, perDay: 1_290, stores: [0, 2, 3, 1, 4, 8], zones: ['Напитки', 'Снеки'], atZones: 0.45 },
    { id: 'demo-c2', title: 'Снеки к футболу', tariff: 'standard', status: 'active', start: '2026-09-12', end: TODAY, finished: false, budget: 800_000, spent: 232_416, price: 9, perDay: 990, stores: [0, 2, 6, 3, 1, 7, 5, 4], zones: [], atZones: 0 },
    { id: 'demo-c7', title: 'Молочная неделя', tariff: 'zones', status: 'budget_ended', start: '2026-08-20', end: '2026-10-02', finished: false, budget: 500_000, spent: 500_000, price: 10.3, perDay: 1_090, stores: [0, 1, 5], zones: ['Молочные продукты'], atZones: 0.4 },
    { id: 'demo-c9', title: 'Летний фестиваль', tariff: 'premium', status: 'completed', start: '2026-06-01', end: '2026-07-31', finished: true, budget: 2_000_000, spent: 1_982_000, price: 20.7, perDay: 1_570, stores: [0, 2, 6, 3, 1, 7, 4, 5, 8, 9], zones: ['Напитки', 'Снеки', 'Кондитерские изделия'], atZones: 0.35 },
  ];
}

const WEEKDAY_FACTOR = [0.85, 0.9, 0.95, 1, 1.15, 1.25, 1.1];
const storeId = (index: number) => `demo-store-${index}`;
const zoneId = (name: string, store: number) => `demo-zone-${store}-${name}`;

function playsOn(campaign: DemoCampaign, day: string, index: number): number {
  return Math.round(campaign.perDay * WEEKDAY_FACTOR[isoWeekday(day) - 1] * (1 + 0.08 * Math.sin(index * 0.7 + campaign.perDay)));
}

/** `total` split by weights; the rounding rest goes to the first part. */
function split(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((weight) => Math.floor((total * weight) / sum));
  parts[0] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

function campaignRow(c: DemoCampaign): StatsCampaignRow {
  return {
    ad_id: c.id,
    title: c.title,
    name: null,
    status: c.status,
    start_date: `${c.start}T09:00:00+05:00`,
    end_date: c.finished ? `${c.end}T23:00:00+05:00` : null,
    submitted_at: null,
    budget: c.budget,
    spent_budget: c.spent,
    remaining_budget: c.budget - c.spent,
    paid_amount: c.budget,
    unpaid_amount: 0,
    invoice_sent_to: null,
    rejection_reasons: null,
    moderator_comment: null,
    price_per_play: c.price,
    tariff_code: c.tariff,
    tariff_can_extend: true,
    store_count: c.stores.length,
    cart_count: c.stores.reduce((sum, index) => sum + STORES[index][3], 0),
    online_cart_count: c.stores.reduce((sum, index) => sum + STORES[index][4], 0),
    content_url: null,
    video_url: null,
    paused_at: null,
    paused_by: null,
  };
}

function demoSource(campaigns: DemoCampaign[], waiting: StatsCampaignRow[]): StatsSource {
  const dailyPlays: StatsSource['dailyPlays'] = [];
  const storePlays: PlaceDayPlays[] = [];
  const zonePlays: PlaceDayPlays[] = [];
  const locations: StatsLocationRow[] = [];
  for (const c of campaigns) {
    for (const index of c.stores) {
      locations.push({ ad_id: c.id, kind: 'store', location_id: storeId(index), location_name: STORES[index][0], parent_store_id: null });
      for (const zone of c.zones) locations.push({ ad_id: c.id, kind: 'zone', location_id: zoneId(zone, index), location_name: zone, parent_store_id: storeId(index) });
    }
    eachDay(c.start, c.end).forEach((day, dayIndex) => {
      const plays = playsOn(c, day, dayIndex);
      dailyPlays.push({ ad_id: c.id, play_date: day, plays });
      const perStore = split(plays, c.stores.map((index) => STORES[index][3] * (1 + ((index * 7) % 5) / 10)));
      c.stores.forEach((index, i) => {
        storePlays.push({ campaignId: c.id, placeId: storeId(index), day, plays: perStore[i] });
        if (!c.zones.length) return;
        split(Math.round(perStore[i] * c.atZones), c.zones.map((_, z) => c.zones.length - z)).forEach((zonePlaysCount, z) =>
          zonePlays.push({ campaignId: c.id, placeId: zoneId(c.zones[z], index), day, plays: zonePlaysCount }),
        );
      });
    });
  }
  return {
    today: TODAY,
    campaigns: [...campaigns.map(campaignRow), ...waiting],
    dailyPlays,
    locations,
    stores: STORES.map(([name, address, city, carts], index) => ({ id: storeId(index), name, address, city, carts })),
    storePlays,
    zonePlays,
    cartsNow: STORES.map(([, , , carts, online], index) => ({ storeId: storeId(index), carts, online })),
    syncedAt: `${TODAY}T07:05:00Z`,
  };
}

function waitingRows(): StatsCampaignRow[] {
  const base = campaignRow(demoCampaigns()[1]);
  return [
    { ...base, ad_id: 'demo-w1', title: 'Осенняя распродажа', status: 'pending', start_date: null, spent_budget: 0, remaining_budget: base.budget },
    { ...base, ad_id: 'demo-w2', title: 'Новогодний бокс', status: 'pending', start_date: null, spent_budget: 0, remaining_budget: base.budget },
    { ...base, ad_id: 'demo-w3', title: 'Кофе с собой', status: 'awaiting_payment', start_date: null, spent_budget: 0, remaining_budget: base.budget },
  ];
}

// Monday of the design heatmap, 8:00–23:00; the other days are scaled.
const HOUR_SHAPE = [67, 101, 125, 153, 175, 175, 137, 146, 159, 210, 250, 247, 233, 163, 112, 58];
const DAY_SHAPE = [1, 1.03, 1.1, 1.17, 1.3, 1.32, 1.12];

/** What the backend RPCs would count for the chosen dates. */
function demoRange(source: StatsSource, selection: StatsSelection): StatsRangeSource {
  const total = source.dailyPlays.reduce((sum, row) => (row.ad_id && selection.ids.has(row.ad_id) && row.play_date && inRange(row.play_date, selection.chartRange) ? sum + (row.plays ?? 0) : sum), 0);
  const weights = DAY_SHAPE.flatMap((day) => HOUR_SHAPE.map((hour) => day * hour));
  const hours = split(total, weights).map((plays, index) => ({ weekday: Math.floor(index / HOUR_SHAPE.length) + 1, hour: (index % HOUR_SHAPE.length) + 8, plays }));
  const worked = (share: number) => STORES.map(([, , , carts], index) => ({ storeId: storeId(index), carts: Math.round(carts * share) }));
  return { hours, worked: { current: worked(0.96), previous: selection.compare ? worked(0.95) : null } };
}

export function demoStatsState(variant: DemoVariant, filters: StatsFilters): StatsState {
  if (variant === 'loading') return { status: 'loading' };
  if (variant === 'error') return { status: 'error', retry: () => window.location.assign('?demo=active') };
  const source = variant === 'new' ? demoSource([], waitingRows()) : demoSource(demoCampaigns(), []);
  const selection = selectStats(source, filters);
  return { status: 'ready', view: buildStatsView(source, demoRange(source, selection), selection, filters) };
}
