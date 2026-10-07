import type { Database, Tables } from '../../lib/database.types';
import { requireSupabase } from '../../lib/supabase';

type Views = Database['public']['Views'];
export type StoreRow = Pick<Tables<'stores'>, 'id' | 'name' | 'city' | 'address' | 'created_at'>;
export type ConnectivityRow = Views['store_cart_connectivity']['Row'];
export type StatsRow = Views['store_stats']['Row'];
export type DailyRow = Pick<Tables<'store_daily_stats'>, 'store_id' | 'stat_date' | 'total_plays'>;
export type ZoneRow = Pick<Tables<'zones'>, 'id' | 'name' | 'description'>;

export interface AnalyticsSource {
  stores: StoreRow[];
  connectivity: ConnectivityRow[];
  stats: StatsRow[];
  daily: DailyRow[];
  today: string;
}

type Page<T> = { data: T[] | null; error: unknown; count: number | null };

/** Respect PostgREST's row limit without silently returning a partial catalog. */
async function allRows<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  while (true) {
    const { data, error, count } = await fetchPage(rows.length, rows.length + 999);
    if (error) throw error;
    if (count === null) throw new Error('Analytics query did not return a row count.');
    rows.push(...(data ?? []));
    if (rows.length >= count) return rows;
    if (!data?.length) throw new Error('Analytics query returned incomplete data.');
  }
}

/** Read existing aggregate endpoints only; never fetch other advertisers' raw logs. */
export async function fetchAnalyticsSource(signal: AbortSignal): Promise<AnalyticsSource> {
  const sb = requireSupabase();
  // Existing store_stats uses CURRENT_DATE in UTC and includes the current day.
  const today = new Date().toISOString().slice(0, 10);
  const [stores, connectivity, stats, daily] = await Promise.all([
    allRows((from, to) => sb.from('stores')
      .select('id, name, city, address, created_at', { count: 'exact' })
      .order('id').range(from, to).abortSignal(signal)),
    allRows((from, to) => sb.from('store_cart_connectivity')
      .select('store_id, total_carts, online_carts, offline_carts', { count: 'exact' })
      .order('store_id').range(from, to).abortSignal(signal)),
    allRows((from, to) => sb.from('store_stats')
      .select('store_id, total_plays, plays_today, plays_week, plays_month', { count: 'exact' })
      .order('store_id').range(from, to).abortSignal(signal)),
    allRows((from, to) => sb.from('store_daily_stats')
      .select('store_id, stat_date, total_plays', { count: 'exact' })
      .order('store_id').order('stat_date').range(from, to).abortSignal(signal)),
  ]);
  return { stores, connectivity, stats, daily, today };
}

export async function fetchStoreZones(storeId: string, signal: AbortSignal): Promise<ZoneRow[]> {
  const sb = requireSupabase();
  return allRows((from, to) => sb.from('zones')
    .select('id, name, description', { count: 'exact' })
    .eq('store_id', storeId).order('id').range(from, to).abortSignal(signal));
}
