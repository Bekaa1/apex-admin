import { todayInAlmaty } from '../../lib/dates';
import { allRows, requireSupabase, uploadToStorage } from '../../lib/supabase';
import { ALL_STORES_NAME, ALL_ZONES_NAME } from '../stores';
import { monthStart } from './model';
import type { CampaignsSource } from './types';
import { extensionOf } from './wizard/media';
import type { CampaignPrefill, MediaState, UploadedMedia, WizardCatalog } from './wizard/types';

// Until the backend adds the `campaign-media` bucket (session-log), media goes where existing campaigns keep it.
const MEDIA_BUCKET = 'documents';

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

/** Stores and shelf zones for the wizard, without the «all stores / all zones» placeholders and beacon data. */
export async function fetchWizardCatalog(signal: AbortSignal): Promise<WizardCatalog> {
  const sb = requireSupabase();
  const [stores, zones] = await Promise.all([
    allRows((from, to) => sb
      .from('stores')
      .select('id, name, address, city', { count: 'exact' })
      .neq('name', ALL_STORES_NAME)
      .order('name')
      .order('id')
      .range(from, to)
      .abortSignal(signal)),
    allRows((from, to) => sb
      .from('zones')
      .select('id, store_id, name', { count: 'exact' })
      .neq('name', ALL_ZONES_NAME)
      .order('name')
      .order('id')
      .range(from, to)
      .abortSignal(signal)),
  ]);
  return {
    // Cart counts, campaigns per store and brands per zone need the backend's catalog views.
    stores: stores.map((store) => ({ id: store.id, name: store.name, address: store.address, city: store.city, carts: null, activeCampaigns: null })),
    zones: zones.flatMap((zone) => (zone.store_id ? [{ id: zone.id, storeId: zone.store_id, name: zone.name, otherBrands: null }] : [])),
  };
}

function storedMedia(url: string | null, fileName: string | null): MediaState {
  return url ? { status: 'ready', url, fileName: fileName || url.split('/').pop() || url, meta: null } : { status: 'empty' };
}

/** Own campaign for «Исправить» and «Повторить»; null when it is not the advertiser's. */
export async function fetchCampaignPrefill(userId: string, campaignId: string, signal: AbortSignal): Promise<CampaignPrefill | null> {
  const sb = requireSupabase();
  const [ad, zones] = await Promise.all([
    sb
      .from('ads')
      .select('status, title, name, video_url, video_original_filename, content_url, cover_original_filename, budget, store_id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .abortSignal(signal)
      .maybeSingle(),
    sb.from('ad_zones').select('zone_id').eq('ad_id', campaignId).abortSignal(signal),
  ]);
  if (ad.error) throw ad.error;
  if (zones.error) throw zones.error;
  if (!ad.data) return null;
  const row = ad.data;
  return {
    status: row.status,
    name: row.title || row.name || '',
    video: storedMedia(row.video_url, row.video_original_filename),
    cover: storedMedia(row.content_url, row.cover_original_filename),
    budget: row.budget,
    storeId: row.store_id,
    zoneIds: zones.data.flatMap((zone) => (zone.zone_id ? [zone.zone_id] : [])),
    // Moderation reasons and the comment are requested from the backend.
    moderation: null,
  };
}

export async function uploadCampaignMedia(userId: string, file: Blob, fileName: string, onProgress: (pct: number) => void, signal: AbortSignal): Promise<UploadedMedia> {
  const path = `campaigns/${userId}/${crypto.randomUUID()}.${extensionOf(fileName) || 'bin'}`;
  const url = await uploadToStorage(MEDIA_BUCKET, path, file, (fraction) => onProgress(Math.round(fraction * 100)), signal);
  return { url, fileName };
}
