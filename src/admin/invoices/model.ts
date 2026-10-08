import type { Database } from '../../lib/database.types';
import type { BadgeTone } from '../../design-system';

export const INVOICE_LIST = '/admin/invoices';
export const PAGE_SIZE = 25;
export const FILTER_LIMIT = 256;
export const INVOICE_STATUSES = ['unpaid', 'paid', 'cancelled'] as const;
export const INVOICE_KINDS = ['initial', 'topup', 'migration'] as const;
type Row = Database['public']['Tables']['advertiser_invoices']['Row'];
export type InvoiceRow = Pick<Row, 'id' | 'user_id' | 'ad_id'> & {
  [K in 'number' | 'kind' | 'amount' | 'status' | 'issued_at' | 'paid_at']: Row[K] | null;
};
export type InvoiceItem = InvoiceRow & { advertiser: string | null; campaign: string | null };
export interface InvoiceFilters { search: string; status: string; kind: string }
export type FilterError = 'number' | 'filters' | 'page';
export interface InvoiceSelection { filters: InvoiceFilters; page: number; error: FilterError | null }
export interface InvoicePage { rows: InvoiceItem[]; count: number | null; hasNext: boolean; profilesUnavailable: boolean; campaignsUnavailable: boolean }

export function isInvoiceId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
/** number is numeric in the generated API. Do not round unsafe integers or use text matching. */
export function invoiceNumber(search: string): number | null | undefined {
  const value = search.trim();
  if (value === '') return null;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return undefined;
  return Number(value);
}
export function filterError(filters: InvoiceFilters): FilterError | null {
  if ([filters.search, filters.status, filters.kind].some(value => value.length > FILTER_LIMIT
    || Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) return 'filters';
  return invoiceNumber(filters.search) === undefined ? 'number' : null;
}
export function readSelection(params: URLSearchParams): InvoiceSelection {
  const filters = { search: params.get('search') ?? '', status: params.get('status') ?? '', kind: params.get('kind') ?? '' };
  const raw = params.get('page') ?? '1';
  const page = Number(raw);
  const badPage = !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(page) || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) || params.getAll('page').length > 1;
  const duplicates = ['search', 'status', 'kind'].some(key => params.getAll(key).length > 1);
  return { filters, page: badPage ? 1 : page, error: badPage ? 'page' : duplicates ? 'filters' : filterError(filters) };
}
export function selectionParams(previous: URLSearchParams, filters: InvoiceFilters, page: number): URLSearchParams {
  const next = new URLSearchParams(previous);
  for (const key of ['search', 'status', 'kind', 'page']) next.delete(key);
  for (const key of ['search', 'status', 'kind'] as const) if (filters[key] !== '') next.set(key, filters[key]);
  next.set('page', String(page));
  return next;
}
export function isInvoiceRow(value: unknown): value is InvoiceRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return ['id', 'user_id', 'ad_id'].every(key => isInvoiceId(row[key]))
    && (row.number === null || typeof row.number === 'number' && Number.isSafeInteger(row.number))
    && (row.amount === null || typeof row.amount === 'number' && Number.isFinite(row.amount))
    && ['status', 'kind', 'issued_at', 'paid_at'].every(key => row[key] === null || typeof row[key] === 'string');
}
export function invoiceStatus(status: string | null): { key?: string; raw?: string; tone: BadgeTone } {
  if (!status) return { key: 'adminInvoices.noData', tone: 'neutral' };
  if (status === 'unpaid') return { key: 'adminInvoices.statuses.unpaid', tone: 'warning' };
  if (status === 'paid') return { key: 'adminInvoices.statuses.paid', tone: 'success' };
  if (status === 'cancelled') return { key: 'adminInvoices.statuses.cancelled', tone: 'neutral' };
  return { raw: status, tone: 'neutral' };
}
export function invoiceKind(kind: string | null): { key?: string; raw?: string } {
  if (!kind) return { key: 'adminInvoices.noData' };
  return INVOICE_KINDS.some(value => value === kind) ? { key: `adminInvoices.kinds.${kind}` } : { raw: kind };
}
