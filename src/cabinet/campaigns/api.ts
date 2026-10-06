import { todayInAlmaty } from '../../lib/dates';
import { allRows, requireSupabase } from '../../lib/supabase';
import { monthStart } from './model';
import type { CampaignsSource } from './types';

/**
 * Everything the campaigns list shows, read in parallel. The my_* views return only the signed-in advertiser's rows;
 * `ads` is filtered by owner explicitly because its RLS still lets every user read every campaign.
 */
export async function fetchCampaignsSource(userId: string, signal: AbortSignal): Promise<CampaignsSource> {
  const sb = requireSupabase();
  const today = todayInAlmaty();
  const [campaigns, dailyPlays, ads, stores] = await Promise.all([
    allRows((from, to) => sb
      .from('my_campaigns_stats')
      .select('ad_id, title, name, status, budget, spent_budget, remaining_budget, total_plays, start_date, end_date, created_at', { count: 'exact' })
      .order('ad_id')
      .range(from, to)
      .abortSignal(signal)),
    allRows((from, to) => sb
      .from('my_daily_plays_by_campaign')
      .select('ad_id, play_date, plays', { count: 'exact' })
      .gte('play_date', monthStart(today))
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
      .select('id, name', { count: 'exact' })
      .order('id')
      .range(from, to)
      .abortSignal(signal)),
  ]);
  return { today, campaigns, dailyPlays, ads, stores };
}
