import type { Database, Json } from '../../lib/database.types';
import { shiftDate, todayInAlmaty } from '../../lib/dates';

export type AuditEvent = Database['public']['Tables']['audit_log']['Row'];
export type AuditRow = Omit<AuditEvent, 'before' | 'after'>;
export const AUDIT_PAGE_SIZE = 25;
export const AUDIT_TIME_ZONE = 'Asia/Almaty';
export const PERIODS = ['today', '7d', '30d', 'custom', 'all'] as const;
export type AuditPeriod = typeof PERIODS[number];
export interface AuditFilters {
  period: AuditPeriod;
  from: string;
  to: string;
  action: string;
  entityType: string;
  actorId: string;
  entityId: string;
}
export type AuditFilterError = 'period' | 'dates' | 'page';
export interface AuditSelection { filters: AuditFilters; page: number; error: AuditFilterError | null }
export interface AuditPageData { rows: AuditRow[]; count: number | null }
const URL_KEYS = ['period', 'from', 'to', 'action', 'entity_type', 'actor_user_id', 'entity_id', 'page'];

function calendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function readAuditSelection(params: URLSearchParams, today = todayInAlmaty()): AuditSelection {
  const rawPeriod = params.get('period') ?? 'today';
  const period = PERIODS.find((value) => value === rawPeriod) ?? 'today';
  const rawPage = params.get('page') ?? '1';
  const page = Number(rawPage);
  const filters: AuditFilters = {
    period,
    from: params.get('from') ?? today,
    to: params.get('to') ?? today,
    action: params.get('action') ?? '',
    entityType: params.get('entity_type') ?? '',
    actorId: params.get('actor_user_id') ?? '',
    entityId: params.get('entity_id') ?? '',
  };
  let error: AuditFilterError | null = null;
  if (!PERIODS.some((value) => value === rawPeriod)) error = 'period';
  else if (!/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(page) || page > Math.floor(Number.MAX_SAFE_INTEGER / AUDIT_PAGE_SIZE)) error = 'page';
  else if (period === 'custom' && (!calendarDate(filters.from) || !calendarDate(filters.to) || filters.from > filters.to || filters.to === '9999-12-31')) error = 'dates';
  return { filters, page: error === 'page' ? 1 : page, error };
}

export function auditParams(previous: URLSearchParams, filters: AuditFilters, page: number): URLSearchParams {
  const next = new URLSearchParams(previous);
  URL_KEYS.forEach((key) => next.delete(key));
  next.set('period', filters.period);
  if (filters.period === 'custom') { next.set('from', filters.from); next.set('to', filters.to); }
  for (const [key, value] of [['action', filters.action], ['entity_type', filters.entityType], ['actor_user_id', filters.actorId], ['entity_id', filters.entityId]]) {
    if (value !== '') next.set(key, value);
  }
  next.set('page', String(page));
  return next;
}

/** Use the IANA zone, not the browser zone or a fixed UTC offset (historical offsets differ). */
export function almatyDayStart(day: string): string {
  if (!calendarDate(day)) throw new Error('Invalid audit date');
  const target = Date.parse(`${day}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: AUDIT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
    const displayed = Date.parse(`${get('year').padStart(4, '0')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`);
    if (displayed === target) return new Date(instant).toISOString();
    instant += target - displayed;
  }
  throw new Error('Unsupported audit date boundary');
}

export function auditBounds(filters: AuditFilters, today = todayInAlmaty()): { from: string; until: string } | null {
  if (filters.period === 'all') return null;
  const to = filters.period === 'custom' ? filters.to : today;
  const from = filters.period === 'custom' ? filters.from : shiftDate(today, filters.period === '7d' ? -6 : filters.period === '30d' ? -29 : 0);
  return { from: almatyDayStart(from), until: almatyDayStart(shiftDate(to, 1)) };
}

export function formatAuditDate(value: string, locale: string, unknown: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, { timeZone: AUDIT_TIME_ZONE, dateStyle: 'medium', timeStyle: 'medium' }).format(date)
    : unknown;
}

export function formatAuditJson(value: Json): string { return JSON.stringify(value, null, 2) ?? 'null'; }

// No confirmed action/entity dictionaries or admin entity-route mappings exist yet.
// Render raw server strings. Do not infer labels or URLs from similar advertiser routes.
