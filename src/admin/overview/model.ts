import type { Database } from '../../lib/database.types';
import type { Lang } from '../../i18n/i18n';

export const CAMPAIGN_COUNTERS = ['pending', 'awaiting_payment', 'active', 'budget_ended'] as const satisfies readonly Database['public']['Enums']['ad_status'][];
export type CampaignCounter = typeof CAMPAIGN_COUNTERS[number];
export type Counter = CampaignCounter | 'unpaid';
export type PendingCampaign = Pick<Database['public']['Tables']['ads']['Row'], 'id' | 'display_id' | 'title' | 'name' | 'created_at'>;
export type CorporateRequest = Pick<Database['public']['Tables']['corporate_requests']['Row'], 'id' | 'company' | 'created_at' | 'status'>;
export interface OverviewResult<T> { value: T; loadedAt: number }
export const OVERVIEW_LIMIT = 5;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const nullableText = (value: unknown) => value === null || typeof value === 'string';

export function isPendingCampaign(value: unknown): value is PendingCampaign {
  return record(value) && typeof value.id === 'string' && typeof value.display_id === 'number'
    && Number.isSafeInteger(value.display_id) && nullableText(value.title) && nullableText(value.name) && nullableText(value.created_at);
}

export function isCorporateRequest(value: unknown): value is CorporateRequest {
  return record(value) && typeof value.id === 'string' && typeof value.company === 'string'
    && typeof value.created_at === 'string' && typeof value.status === 'string';
}

export function exactCount(value: number | null): number {
  if (value === null || !Number.isSafeInteger(value) || value < 0) throw new Error('Missing exact count');
  return value;
}

export function overviewDate(value: string | number | null, lang: Lang, unknown: string): string {
  if (value === null) return unknown;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return unknown;
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
    timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(date);
}
