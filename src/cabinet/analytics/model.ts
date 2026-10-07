import type { Lang } from '../../i18n/i18n';
import { shiftDate } from '../../lib/dates';
import type { AnalyticsSource, ZoneRow } from './api';
import type { AnalyticsCatalog, DailyPlays, Period, StoreInsight, StoreZone } from './types';

function count(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function buildAnalyticsCatalog(source: AnalyticsSource): AnalyticsCatalog {
  const connectivity = new Map(source.connectivity.map((row) => [row.store_id, row]));
  const stats = new Map(source.stats.map((row) => [row.store_id, row]));
  const daily = new Map<string, DailyPlays[]>();
  for (const row of source.daily) {
    const plays = count(row.total_plays);
    if (plays === null) continue;
    const days = daily.get(row.store_id) ?? [];
    days.push({ date: row.stat_date, plays });
    daily.set(row.store_id, days);
  }
  const stores = source.stores.filter((store) => store.name.trim() !== 'Все магазины').map((store) => {
      const fleet = connectivity.get(store.id);
      const totals = stats.get(store.id);
      const carts = count(fleet?.total_carts);
      const online = count(fleet?.online_carts);
      const storeDaily = (daily.get(store.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));
      return {
        id: store.id,
        name: store.name,
        city: store.city?.trim() || null,
        address: store.address?.trim() || null,
        createdAt: store.created_at,
        carts,
        online: carts !== null && online !== null && online <= carts ? online : null,
        playsToday: count(totals?.plays_today),
        playsWeek: count(totals?.plays_week),
        playsMonth: count(totals?.plays_month),
        playsTotal: count(totals?.total_plays),
        daily: storeDaily,
      };
    });
  const historyBounds = stores.map((store) => {
    if (store.daily.length) return store.daily[0].date;
    if (store.playsTotal === 0 && store.createdAt) return store.createdAt.slice(0, 10);
    return null;
  });
  const availableFrom = historyBounds.length && historyBounds.every((date): date is string => date !== null)
    ? historyBounds.reduce((latest, date) => date > latest ? date : latest, historyBounds[0])
    : source.today;
  return {
    today: source.today,
    stores,
    availableFrom,
  };
}

export function buildStoreZones(rows: ZoneRow[]): StoreZone[] {
  return rows.filter((zone) => zone.name.trim() !== 'Все зоны');
}

export function periodStart(period: Period, today: string, from = today) {
  return period === 'custom' ? from : shiftDate(today, period === 'today' ? 0 : period === '7d' ? -7 : -30);
}

function dateDistance(start: string, end: string) {
  return Math.max(0, (Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86_400_000);
}

export function storeMetrics(store: StoreInsight, period: Period, today: string, from = today, to = today, availableFrom = today) {
  const start = periodStart(period, today, from);
  const end = period === 'custom' ? to : today;
  const hasStoreHistory = store.daily.length > 0 || store.playsTotal === 0;
  const storeHistoryFrom = store.daily[0]?.date ?? store.createdAt?.slice(0, 10) ?? today;
  const historyFrom = storeHistoryFrom > availableFrom ? storeHistoryFrom : availableFrom;
  const historyAvailable = period !== 'custom' || (hasStoreHistory && start >= historyFrom && end >= start && end <= today);
  const availableDays = store.daily.filter((day) => day.date >= start && day.date <= end);
  const days = period === 'custom' && historyAvailable
    ? Array.from({ length: dateDistance(start, end) + 1 }, (_, index) => {
        const date = shiftDate(start, index);
        return availableDays.find((day) => day.date === date) ?? { date, plays: 0 };
      })
    : availableDays;
  const completedDays = days.filter((day) => day.date < today);
  const average = completedDays.length ? Math.round(completedDays.reduce((sum, day) => sum + day.plays, 0) / completedDays.length) : null;
  // Daily rows are retained separately and can differ from the existing totals.
  const plays = !historyAvailable ? null : period === 'custom' ? days.reduce((sum, day) => sum + day.plays, 0) : period === 'today' ? store.playsToday : period === '7d' ? store.playsWeek : store.playsMonth;
  return { days: historyAvailable ? days : null, plays, average: historyAvailable ? average : null, averageDays: completedDays.length, historyAvailable, historyFrom };
}

export function formatDay(date: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(new Date(date + 'T00:00:00Z'));
}

export function periodRange(period: Period, today: string, lang: Lang, from = today, to = today) {
  if (period === 'custom') return formatDay(from, lang) + ' — ' + formatDay(to, lang);
  return period === 'today' ? formatDay(today, lang) : formatDay(periodStart(period, today), lang) + ' — ' + formatDay(today, lang);
}
