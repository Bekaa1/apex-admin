import type { PostgrestError } from '@supabase/supabase-js';
import { todayInAlmaty } from '../../lib/dates';
import { allRows, requireSupabase, uploadToStorage } from '../../lib/supabase';
import { TARIFFS, type TariffCode } from '../tariffs';
import { monthStart } from './model';
import type { CampaignDetailsSource } from './details/types';
import type { InvoiceSource } from './payment/kaspi';
import type { CampaignsSource } from './types';
import { extensionOf } from './wizard/media';
import type { CampaignEdit, CampaignPrefill, CampaignSubmission, MediaMeta, MediaState, StoreCatalog, UploadedMedia } from './wizard/types';

const MEDIA_BUCKET = 'campaign-media';
const MEDIA_EXTENSIONS = ['mp4', 'mov', 'jpg', 'jpeg', 'png'];
const EXTENSION_BY_TYPE: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** A server check failed: `code` names it (`invalid_video`, `missing_email`…), `field` is the payload key it concerns. */
export class CampaignRpcError extends Error {
  readonly code: string;
  readonly field: string | null;

  constructor(code: string, field: string | null) {
    super(code);
    this.name = 'CampaignRpcError';
    this.code = code;
    this.field = field;
  }
}

// The campaign functions raise P0001 with the code in `message` and the field in `hint`.
function rpcError(error: PostgrestError): Error {
  return error.code === 'P0001' ? new CampaignRpcError(error.message, error.hint || null) : error;
}

const CAMPAIGN_COLUMNS =
  'ad_id, title, name, status, budget, spent_budget, remaining_budget, total_plays, start_date, end_date, created_at, tariff_code, store_count, cart_count, content_url, video_url, paid_amount, unpaid_amount, invoice_sent_to, rejection_reasons, moderator_comment, submitted_at, tariff_can_extend, paused_at, paused_by';

/** Everything the campaigns list shows, read in parallel. The my_* views return only the signed-in advertiser's rows. */
export async function fetchCampaignsSource(signal: AbortSignal): Promise<CampaignsSource> {
  const sb = requireSupabase();
  const today = todayInAlmaty();
  const [campaigns, dailyPlays] = await Promise.all([
    allRows((from, to) => sb
      .from('my_campaigns_stats')
      .select(
        CAMPAIGN_COLUMNS,
        { count: 'exact' },
      )
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
  ]);
  return { today, campaigns, dailyPlays };
}

/** One own campaign for its card, with its files, stores and zones, daily plays and invoices; null when it is not the advertiser's. */
export async function fetchCampaignDetails(campaignId: string, signal: AbortSignal): Promise<CampaignDetailsSource | null> {
  const sb = requireSupabase();
  const [campaign, ad, locations, dailyPlays, invoices, tariffs] = await Promise.all([
    sb
      .from('my_campaigns_stats')
      .select(
        'ad_id, title, name, status, budget, spent_budget, remaining_budget, total_plays, start_date, end_date, created_at, tariff_code, store_count, cart_count, content_url, paid_amount, unpaid_amount, invoice_sent_to, rejection_reasons, moderator_comment, submitted_at, tariff_can_extend, moderated_at, description, video_url, video_duration_sec, price_per_play, plays_count, tariff_version, tariff_min_amount, tariff_current_price, paused_at, paused_by',
      )
      .eq('ad_id', campaignId)
      .abortSignal(signal)
      .maybeSingle(),
    sb.from('ads').select('video_original_filename, video_width, video_height, cover_original_filename').eq('id', campaignId).abortSignal(signal).maybeSingle(),
    sb.from('my_campaign_locations').select('kind, location_id, location_name, parent_store_id').eq('ad_id', campaignId).abortSignal(signal),
    allRows((from, to) => sb
      .from('my_daily_plays_by_campaign')
      .select('ad_id, play_date, plays', { count: 'exact' })
      .eq('ad_id', campaignId)
      .order('play_date')
      .range(from, to)
      .abortSignal(signal)),
    sb
      .from('advertiser_invoices')
      .select('id, number, kind, amount, status, issued_at, paid_at, sent_to, tariff_version, price_per_play')
      .eq('ad_id', campaignId)
      .order('issued_at')
      .abortSignal(signal),
    sb.from('tariffs').select('code, updated_at').abortSignal(signal),
  ]);
  for (const result of [campaign, ad, locations, invoices, tariffs]) if (result.error) throw result.error;
  if (!campaign.data) return null;
  const row = campaign.data;
  return {
    today: todayInAlmaty(),
    campaign: row,
    files: {
      video: ad.data?.video_original_filename ?? null,
      width: ad.data?.video_width ?? null,
      height: ad.data?.video_height ?? null,
      cover: ad.data?.cover_original_filename ?? null,
    },
    locations: locations.data ?? [],
    dailyPlays,
    invoices: invoices.data ?? [],
    tariffChangedAt: tariffs.data?.find((tariff) => tariff.code === row.tariff_code)?.updated_at ?? null,
  };
}

/** Own invoices of a campaign: the first one and top-ups. */
export async function fetchCampaignInvoices(campaignId: string, signal: AbortSignal): Promise<InvoiceSource[]> {
  const { data, error } = await requireSupabase().from('advertiser_invoices').select('number, amount, status, issued_at').eq('ad_id', campaignId).abortSignal(signal);
  if (error) throw error;
  return data;
}

/** Stores with carts and their shelf zones with a working beacon, as the backend offers them for sale. */
export async function fetchStoreCatalog(signal: AbortSignal): Promise<StoreCatalog> {
  const sb = requireSupabase();
  const stores = await sb.rpc('catalog_stores').order('name').abortSignal(signal);
  if (stores.error) throw stores.error;
  const zones = await sb.rpc('catalog_zones', { p_store_ids: stores.data.map((store) => store.id) }).order('name').abortSignal(signal);
  if (zones.error) throw zones.error;
  return {
    stores: stores.data.map((store) => ({
      id: store.id,
      name: store.name,
      address: store.address,
      city: store.city,
      carts: store.cart_count,
      activeCampaigns: store.active_campaigns,
    })),
    zones: zones.data.map((zone) => ({ id: zone.id, storeId: zone.store_id, name: zone.name, otherBrands: zone.other_brands })),
  };
}

function isOwnMedia(url: string, userId: string): boolean {
  return url.includes(`/object/public/${MEDIA_BUCKET}/${userId}/`);
}

/** Files outside the advertiser's folder (older campaigns) can't be sent again, so the form asks for them anew. */
function storedMedia(url: string | null, fileName: string | null, meta: MediaMeta | null, userId: string): MediaState {
  if (!url || !isOwnMedia(url, userId)) return { status: 'empty' };
  return { status: 'ready', url, fileName: fileName || url.split('/').pop() || url, meta };
}

function videoMeta(row: { video_duration_sec: number | null; video_width: number | null; video_height: number | null; video_size_bytes: number | null }): MediaMeta | null {
  const { video_duration_sec: durationSec, video_width: width, video_height: height, video_size_bytes: sizeBytes } = row;
  return durationSec !== null && width !== null && height !== null && sizeBytes !== null ? { durationSec, width, height, sizeBytes } : null;
}

function tariffCode(code: string | null | undefined): TariffCode | null {
  return TARIFFS.find((tariff) => tariff.code === code)?.code ?? null;
}

/** Own campaign for «Редактировать», «Исправить» and «Повторить»; null when it is not the advertiser's. */
export async function fetchCampaignPrefill(userId: string, campaignId: string, signal: AbortSignal): Promise<CampaignPrefill | null> {
  const sb = requireSupabase();
  const [ad, stores, zones] = await Promise.all([
    sb
      .from('ads')
      .select(
        'status, title, name, description, budget, daily_play_limit, spent_budget, start_date, rejection_reasons, moderator_comment, video_url, video_original_filename, video_duration_sec, video_width, video_height, video_size_bytes, content_url, cover_original_filename, tariff:tariffs(code, purchasable, is_archived, can_select_zone)',
      )
      .eq('id', campaignId)
      .eq('user_id', userId)
      .abortSignal(signal)
      .maybeSingle(),
    sb.from('ad_stores').select('store_id').eq('ad_id', campaignId).abortSignal(signal),
    sb.from('ad_zones').select('zone_id').eq('ad_id', campaignId).abortSignal(signal),
  ]);
  if (ad.error) throw ad.error;
  if (stores.error) throw stores.error;
  if (zones.error) throw zones.error;
  if (!ad.data) return null;
  const row = ad.data;
  const meta = videoMeta(row);
  const reasons = row.rejection_reasons ?? [];
  return {
    status: row.status,
    spent: row.spent_budget,
    launched: row.start_date !== null,
    tariffSold: row.tariff ? row.tariff.purchasable && !row.tariff.is_archived : false,
    tariffZones: row.tariff?.can_select_zone ?? true,
    name: row.title || row.name || '',
    description: row.description ?? '',
    tariff: tariffCode(row.tariff?.code),
    // A video without its size and length can't pass the server checks, so it has to be uploaded again.
    video: meta ? storedMedia(row.video_url, row.video_original_filename, meta, userId) : { status: 'empty' },
    cover: storedMedia(row.content_url, row.cover_original_filename, null, userId),
    budget: row.budget,
    dailyLimit: row.daily_play_limit,
    storeIds: stores.data.flatMap((link) => (link.store_id ? [link.store_id] : [])),
    zoneIds: zones.data.flatMap((link) => (link.zone_id ? [link.zone_id] : [])),
    moderation: reasons.length || row.moderator_comment ? { rules: reasons, comment: row.moderator_comment } : null,
  };
}

// Storage takes only Latin names, so files are saved as <uuid>.<ext> and the original name goes with the campaign.
function storageExtension(file: Blob, fileName: string): string {
  const extension = extensionOf(fileName);
  return MEDIA_EXTENSIONS.includes(extension) ? extension : (EXTENSION_BY_TYPE[file.type] ?? extension);
}

export async function uploadCampaignMedia(userId: string, file: Blob, fileName: string, onProgress: (pct: number) => void, signal: AbortSignal): Promise<UploadedMedia> {
  const path = `${userId}/${crypto.randomUUID()}.${storageExtension(file, fileName)}`;
  const url = await uploadToStorage(MEDIA_BUCKET, path, file, (fraction) => onProgress(Math.round(fraction * 100)), signal);
  return { url, fileName };
}

function contentPayload(content: CampaignEdit) {
  const { video, cover } = content;
  return {
    name: content.name,
    description: content.description,
    video: { url: video.url, file_name: video.fileName, duration_sec: video.durationSec, width: video.width, height: video.height, size_bytes: video.sizeBytes },
    cover: cover ? { url: cover.url, file_name: cover.fileName } : null,
    store_ids: content.storeIds,
    zone_ids: content.zoneIds,
  };
}

/** Creates the campaign (status «На проверке») and its invoice at the plan's terms of `tariff_version`, then sets its daily limit; resending the same request returns the same id. */
export async function submitCampaign(submission: CampaignSubmission): Promise<string> {
  const p = {
    ...contentPayload(submission),
    tariff_code: submission.tariffCode,
    tariff_version: submission.tariffVersion,
    budget: submission.budget,
    request_id: submission.requestId,
  };
  const sb = requireSupabase();
  const { data: id, error } = await sb.rpc('submit_campaign', { p });
  if (error) throw rpcError(error);
  // submit_campaign doesn't take the limit; if this call fails, a resend gets the same campaign back and sets it again.
  if (submission.dailyLimit !== null) {
    const limit = await sb.rpc('set_campaign_daily_limit', { p_id: id, p_limit: submission.dailyLimit });
    if (limit.error) throw rpcError(limit.error);
  }
  return id;
}

/** «Редактировать» and «Исправить»: the campaign goes back to moderation and stops showing until approved. The plan and the budget stay. */
export async function editCampaign(campaignId: string, content: CampaignEdit): Promise<string> {
  const { data, error } = await requireSupabase().rpc('edit_campaign', { p_id: campaignId, p: contentPayload(content) });
  if (error) throw rpcError(error);
  return data;
}

/** «Поставить на паузу» and «Возобновить»: no moderation, the video, stores and budget stay. Returns the new status; a resume without budget left gives `budget_ended`. */
export async function setCampaignPaused(campaignId: string, paused: boolean): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = paused ? await sb.rpc('pause_campaign', { p_id: campaignId }) : await sb.rpc('resume_campaign', { p_id: campaignId });
  if (error) throw rpcError(error);
  return data;
}

export interface TopUpInvoice {
  amount: number;
  /** The price of a play fixed in the invoice. */
  pricePerPlay: number | null;
  /** null when the backend didn't record the address. */
  sentTo: string | null;
}

/** «Пополнить»: a new invoice for the same campaign at the plan's current terms. An unpaid top-up invoice is replaced. */
export async function extendCampaign(campaignId: string, amount: number, tariffVersion: number): Promise<TopUpInvoice> {
  const sb = requireSupabase();
  const { data: invoiceId, error } = await sb.rpc('extend_campaign', { p_id: campaignId, p_amount: amount, p_tariff_version: tariffVersion });
  if (error) throw rpcError(error);
  const invoice = await sb.from('advertiser_invoices').select('amount, sent_to, price_per_play').eq('id', invoiceId).maybeSingle();
  // The invoice exists either way; without the read-back the screen shows the amount that was asked for.
  return { amount: invoice.data?.amount ?? amount, sentTo: invoice.data?.sent_to ?? null, pricePerPlay: invoice.data?.price_per_play ?? null };
}

export interface CorporateRequest {
  company: string;
  contactName: string;
  phone: string;
  message: string;
}

/** Managers get a notification; the account's email is attached by the backend. */
export async function submitCorporateRequest(request: CorporateRequest): Promise<string> {
  const { data, error } = await requireSupabase().rpc('submit_corporate_request', {
    p: { company: request.company, contact_name: request.contactName, phone: request.phone, message: request.message },
  });
  if (error) throw rpcError(error);
  return data;
}
