import { todayInAlmaty } from '../../lib/dates';
import { requireSupabase } from '../../lib/supabase';
import { playsSince } from './model';
import type { HomeSource } from './types';

function rows<T>({ data, error }: { data: T[] | null; error: unknown }): T[] {
  if (error) throw error;
  return data ?? [];
}

/**
 * Everything Home shows, read in parallel. The my_* views return only the signed-in advertiser's rows;
 * `ads` is filtered by owner explicitly because its RLS still lets every user read every campaign.
 */
export async function fetchHomeSource(userId: string): Promise<HomeSource> {
  const sb = requireSupabase();
  const today = todayInAlmaty();
  const [campaigns, dailyPlays, extras, stores] = await Promise.all([
    sb
      .from('my_campaigns_stats')
      .select('ad_id, title, name, status, budget, spent_budget, remaining_budget, total_plays, created_at'),
    sb
      .from('my_daily_plays_by_campaign')
      .select('ad_id, play_date, plays')
      .gte('play_date', playsSince(today)),
    sb.from('ads').select('id, content_url, store_id').eq('user_id', userId),
    sb.from('stores').select('id, name, city'),
  ]);
  return {
    today,
    campaigns: rows(campaigns),
    dailyPlays: rows(dailyPlays),
    extras: rows(extras),
    stores: rows(stores),
  };
}
