import { todayInAlmaty } from '../../lib/dates';
import { requireSupabase } from '../../lib/supabase';
import { playsSince } from './model';
import type { HomeSource } from './types';

type Page<T> = { data: T[] | null; error: unknown; count: number | null };

/** A successful PostgREST response can still be capped by the project's max_rows setting. */
async function allRows<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const result: T[] = [];
  while (true) {
    const { data, error, count } = await fetchPage(result.length, result.length + 999);
    if (error) throw error;
    if (count === null) throw new Error('Home query did not return a row count.');
    result.push(...(data ?? []));
    if (result.length >= count) return result;
    if (!data?.length) throw new Error('Home query returned incomplete data.');
  }
}

/**
 * Everything Home shows, read in parallel. The my_* views return only the signed-in advertiser's rows;
 * `ads` is filtered by owner explicitly because its RLS still lets every user read every campaign.
 */
export async function fetchHomeSource(userId: string, signal: AbortSignal): Promise<HomeSource> {
  const sb = requireSupabase();
  const today = todayInAlmaty();
  const [campaigns, dailyPlays, extras, stores] = await Promise.all([
    allRows((from, to) => sb
      .from('my_campaigns_stats')
      .select('ad_id, title, name, status, budget, spent_budget, remaining_budget, total_plays, created_at', { count: 'exact' })
      .order('ad_id')
      .range(from, to)
      .abortSignal(signal)),
    allRows((from, to) => sb
      .from('my_daily_plays_by_campaign')
      .select('ad_id, play_date, plays', { count: 'exact' })
      .gte('play_date', playsSince(today))
      .lte('play_date', today)
      .order('play_date')
      .order('ad_id')
      .range(from, to)
      .abortSignal(signal)),
    allRows((from, to) => sb
      .from('ads')
      .select('id, content_url, store_id', { count: 'exact' })
      .eq('user_id', userId)
      .order('id')
      .range(from, to)
      .abortSignal(signal)),
    allRows((from, to) => sb
      .from('stores')
      .select('id, name, city', { count: 'exact' })
      .order('id')
      .range(from, to)
      .abortSignal(signal)),
  ]);
  return {
    today,
    campaigns,
    dailyPlays,
    extras,
    stores,
  };
}
