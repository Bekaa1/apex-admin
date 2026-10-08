// Rows of the tables and cards: campaigns, stores, carts and shelf zones of the chosen campaigns.
import { shiftDate } from '../../lib/dates';
import { linkedStores } from '../stores';
import { inRange } from './period';
import type { CampaignLine, CartsSummary, Change, DateRange, PlaceDayPlays, StatsLocationRow, StatsRangeSource, StatsSource, StatsStore, StoreLine, ZonesSummary } from './types';
import type { Chosen } from './selection';

/** vs the previous period; `null` when the period has nothing to compare with at all. */
export function changeOf(current: number, previous: number | null): Change {
  if (previous === null) return null;
  if (previous > 0) return current / previous - 1;
  return current > 0 ? 'new' : null;
}

/** Plays per place (store or zone) of the chosen campaigns within the dates. */
function playsByPlace(rows: PlaceDayPlays[], ids: ReadonlySet<string>, range: DateRange): Map<string, number> {
  const plays = new Map<string, number>();
  for (const row of rows) {
    if (ids.has(row.campaignId) && inRange(row.day, range)) plays.set(row.placeId, (plays.get(row.placeId) ?? 0) + row.plays);
  }
  return plays;
}

/** Real stores where the chosen campaigns run; «Все магазины» stands for every store. */
export function storesOfChosen(source: StatsSource, ids: ReadonlySet<string>): StatsStore[] {
  const locations = source.locations.filter((location) => location.ad_id && ids.has(location.ad_id));
  return linkedStores(locations, source.stores, (id, name) => ({ id, name, address: null, city: null, carts: null }));
}

const TREND_DAYS = 14;

export interface CampaignPlays {
  current: ReadonlyMap<string, number>;
  previous: ReadonlyMap<string, number> | null;
}

export function campaignLines(chosen: Chosen[], plays: CampaignPlays, perDay: (id: string, day: string) => number, chartRange: DateRange, spentOf: (c: Chosen, plays: number) => number): CampaignLine[] {
  const total = chosen.reduce((sum, c) => sum + (plays.current.get(c.id) ?? 0), 0);
  const trendDays = Array.from({ length: TREND_DAYS }, (_, index) => shiftDate(chartRange.to, index - TREND_DAYS + 1)).filter((day) => day >= chartRange.from);
  return chosen
    .flatMap((c) => {
      const count = plays.current.get(c.id) ?? 0;
      if (count === 0) return [];
      const spent = spentOf(c, count);
      const line: CampaignLine = {
        id: c.id,
        name: c.name,
        coverUrl: c.row.content_url || null,
        videoUrl: c.row.video_url || null,
        coverTone: c.coverTone,
        tariff: c.tariff,
        stage: c.stage,
        plays: count,
        change: changeOf(count, plays.previous ? (plays.previous.get(c.id) ?? 0) : null),
        share: total > 0 ? count / total : 0,
        spent,
        price: spent / count,
        trend: trendDays.map((day) => perDay(c.id, day)),
      };
      return [line];
    })
    .sort((a, b) => b.plays - a.plays);
}

export function storeLines(source: StatsSource, rows: PlaceDayPlays[], ids: ReadonlySet<string>, range: DateRange, compare: DateRange | null): StoreLine[] {
  const current = playsByPlace(rows, ids, range);
  const previous = compare ? playsByPlace(rows, ids, compare) : null;
  const total = [...current.values()].reduce((sum, plays) => sum + plays, 0);
  return [...current.entries()]
    .filter(([, plays]) => plays > 0)
    .map(([id, plays]) => {
      const store = source.stores.find((s) => s.id === id);
      const now = source.cartsNow?.find((s) => s.storeId === id) ?? null;
      const carts = now?.carts ?? store?.carts ?? null;
      return {
        id,
        name: store?.name ?? source.locations.find((location) => location.location_id === id)?.location_name ?? '—',
        address: store ? [store.address, store.city].filter(Boolean).join(', ') || null : null,
        plays,
        change: changeOf(plays, previous ? (previous.get(id) ?? 0) : null),
        share: total > 0 ? plays / total : 0,
        perCart: carts ? plays / carts : null,
        carts: now ? { online: now.online, total: now.carts } : null,
      };
    })
    .sort((a, b) => b.plays - a.plays);
}

const WORST_STORES = 3;

export function cartsSummary(source: StatsSource, stores: StatsStore[], worked: StatsRangeSource['worked']): CartsSummary | null {
  if (!source.cartsNow) return null;
  const now = stores.flatMap((store) => {
    const carts = source.cartsNow?.find((s) => s.storeId === store.id);
    return carts ? [{ store, ...carts }] : [];
  });
  const total = now.reduce((sum, s) => sum + s.carts, 0);
  if (total === 0) return null;
  const workedShare = (rows: { storeId: string; carts: number }[]) => rows.filter((row) => stores.some((s) => s.id === row.storeId)).reduce((sum, row) => sum + row.carts, 0) / total;
  const share = worked ? workedShare(worked.current) : null;
  const previous = worked?.previous ? workedShare(worked.previous) : null;
  return {
    online: now.reduce((sum, s) => sum + s.online, 0),
    total,
    worked: share === null ? null : { share, change: previous ? share / previous - 1 : null },
    worst: now
      .map((s) => ({ id: s.store.id, name: [s.store.name, s.store.address].filter(Boolean).join(', '), offline: s.carts - s.online }))
      .filter((s) => s.offline > 0)
      .sort((a, b) => b.offline - a.offline)
      .slice(0, WORST_STORES),
  };
}

/** Plays at the chosen shelf zones vs the general rotation; zones with one name are summed over stores. */
export function zonesSummary(locations: StatsLocationRow[], rows: PlaceDayPlays[], ids: ReadonlySet<string>, totalPlays: number, range: DateRange, compare: DateRange | null): ZonesSummary | null {
  const zones = locations.filter((location) => location.kind === 'zone' && location.ad_id && ids.has(location.ad_id) && location.location_id);
  if (!zones.length) return null;
  const current = playsByPlace(rows, ids, range);
  const previous = compare ? playsByPlace(rows, ids, compare) : null;
  // «в N магазинах» counts the stores where the zone played in the period.
  const groups = new Map<string, { zoneIds: Set<string>; storeIds: Set<string> }>();
  for (const zone of zones) {
    const name = zone.location_name ?? '—';
    const group = groups.get(name) ?? { zoneIds: new Set<string>(), storeIds: new Set<string>() };
    if (zone.location_id) group.zoneIds.add(zone.location_id);
    if (zone.parent_store_id && zone.location_id && (current.get(zone.location_id) ?? 0) > 0) group.storeIds.add(zone.parent_store_id);
    groups.set(name, group);
  }
  const sum = (plays: ReadonlyMap<string, number>, zoneIds: Set<string>) => [...zoneIds].reduce((total, id) => total + (plays.get(id) ?? 0), 0);
  const lines = [...groups.entries()]
    .map(([name, group]) => {
      const plays = sum(current, group.zoneIds);
      return { name, stores: group.storeIds.size, plays, change: changeOf(plays, previous ? sum(previous, group.zoneIds) : null) };
    })
    .filter((line) => line.plays > 0)
    .sort((a, b) => b.plays - a.plays);
  const atZones = lines.reduce((total, line) => total + line.plays, 0);
  return { zones: atZones, rotation: Math.max(totalPlays - atZones, 0), lines };
}
