import { todayInAlmaty } from '../../lib/dates';
import { allRows, requireSupabase } from '../../lib/supabase';
import type { StatsSource } from './types';

const CAMPAIGN_COLUMNS =
  'ad_id, title, name, status, start_date, end_date, submitted_at, budget, spent_budget, remaining_budget, paid_amount, unpaid_amount, invoice_sent_to, rejection_reasons, moderator_comment, price_per_play, tariff_code, tariff_can_extend, store_count, cart_count, online_cart_count, content_url, video_url';

/**
 * Own campaigns with all their daily plays, chosen stores and zones, and the store catalog, read in parallel; the my_* views
 * return only the signed-in advertiser's rows. Plays by store, zone and hour wait for backend views (session-log, 07.10).
 */
export async function fetchStatsSource(signal: AbortSignal): Promise<StatsSource> {
  const sb = requireSupabase();
  const [campaigns, dailyPlays, locations, stores] = await Promise.all([
    allRows((from, to) => sb.from('my_campaigns_stats').select(CAMPAIGN_COLUMNS, { count: 'exact' }).order('ad_id').range(from, to).abortSignal(signal)),
    allRows((from, to) =>
      sb.from('my_daily_plays_by_campaign').select('ad_id, play_date, plays', { count: 'exact' }).order('play_date').order('ad_id').range(from, to).abortSignal(signal),
    ),
    allRows((from, to) =>
      sb
        .from('my_campaign_locations')
        .select('ad_id, kind, location_id, location_name, parent_store_id', { count: 'exact' })
        .order('ad_id')
        .order('location_id')
        .range(from, to)
        .abortSignal(signal),
    ),
    sb.rpc('catalog_stores').abortSignal(signal),
  ]);
  if (stores.error) throw stores.error;
  return {
    today: todayInAlmaty(),
    campaigns,
    dailyPlays,
    locations,
    stores: stores.data.map((store) => ({ id: store.id, name: store.name, address: store.address, city: store.city, carts: store.cart_count })),
    storePlays: null,
    zonePlays: null,
    cartsNow: null,
    syncedAt: null,
  };
}
