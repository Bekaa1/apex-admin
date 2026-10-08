import type { Database } from '../../../lib/database.types';
import type { Lang } from '../../../i18n/i18n';
import { isCampaignId, isCampaignRow, type CampaignRow } from '../model';
import { overviewDate } from '../../overview/model';

type Tables = Database['public']['Tables'];
type Nullable<T> = { [K in keyof T]: T[K] | null };
export type CampaignDetail = CampaignRow & Pick<Tables['ads']['Row'],
  'description' | 'submitted_at' | 'start_date' | 'end_date' | 'video_url' | 'content_url'
  | 'video_original_filename' | 'cover_original_filename' | 'video_duration_sec' | 'video_width' | 'video_height'
  | 'video_size_bytes' | 'rejection_reasons' | 'moderator_comment' | 'moderated_at' | 'moderated_by'>;
export type Advertiser = Pick<Tables['users']['Row'], 'id' | 'full_name' | 'display_name' | 'company_name'>;
export type Tariff = Pick<Tables['tariffs']['Row'], 'id' | 'name' | 'code'>;
export type Invoice = Pick<Tables['advertiser_invoices']['Row'], 'id' | 'ad_id'> & Nullable<Pick<Tables['advertiser_invoices']['Row'], 'number' | 'amount' | 'status' | 'issued_at' | 'paid_at'>>;
export type Portion = Pick<Tables['ad_budget_portions']['Row'], 'id' | 'ad_id' | 'invoice_id'> & Nullable<Pick<Tables['ad_budget_portions']['Row'], 'amount' | 'spent' | 'price_per_play' | 'position'>>;
export type Placement = { id: string; ad_id: string | null; targetId: string | null; name: string | null };
export type PlacementKind = 'stores' | 'zones';
export interface RelatedPage<T> { rows: T[]; count: number | null }

export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export const nullableText = (value: unknown): value is string | null => value === null || typeof value === 'string';
export const nullableNumber = (value: unknown): value is number | null => value === null || typeof value === 'number' && Number.isFinite(value);
export function isCampaignDetail(value: unknown): value is CampaignDetail {
  return record(value)
    && ['description', 'submitted_at', 'start_date', 'end_date', 'video_url', 'content_url', 'video_original_filename', 'cover_original_filename', 'moderator_comment', 'moderated_at', 'moderated_by'].every((key) => nullableText(value[key]))
    && ['video_duration_sec', 'video_width', 'video_height', 'video_size_bytes'].every((key) => nullableNumber(value[key]))
    && (value.rejection_reasons === null || Array.isArray(value.rejection_reasons) && value.rejection_reasons.every((item) => typeof item === 'string')) && isCampaignRow(value);
}
export function isAdvertiser(value: unknown): value is Advertiser {
  return record(value) && isCampaignId(value.id) && ['full_name', 'display_name', 'company_name'].every((key) => nullableText(value[key]));
}
export function isInvoice(value: unknown): value is Invoice {
  return record(value) && isCampaignId(value.id) && isCampaignId(value.ad_id)
    && nullableNumber(value.number) && (value.number === null || Number.isSafeInteger(value.number)) && nullableNumber(value.amount)
    && ['status', 'issued_at', 'paid_at'].every((key) => nullableText(value[key]));
}
export function isPortion(value: unknown): value is Portion {
  return record(value) && isCampaignId(value.id) && isCampaignId(value.ad_id) && (value.invoice_id === null || isCampaignId(value.invoice_id))
    && ['amount', 'spent', 'price_per_play', 'position'].every((key) => nullableNumber(value[key]))
    && (value.position === null || Number.isSafeInteger(value.position));
}

/** Use stored absolute URLs only. No bucket inference, credentials, data or script URLs. */
export function mediaUrl(value: string | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function resolution(width: number | null, height: number | null, unknown: string): string {
  return width !== null && height !== null && Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0 ? `${width} × ${height}` : unknown;
}
/** A calendar date has no time of day; timestamps retain the project's Almaty formatting. */
export function campaignDate(value: string | null, lang: Lang, unknown: string): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return unknown;
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
  return overviewDate(value, lang, unknown);
}
/** Fractional prices must not be rounded to zero by the whole-tenge money formatter. */
export function unitPrice(value: number | null, lang: Lang, unknown: string): string {
  if (value === null || !Number.isFinite(value)) return unknown;
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU', { style: 'currency', currency: 'KZT', currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 20 }).format(value);
}
