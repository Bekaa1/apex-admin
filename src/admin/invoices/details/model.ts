import type { Database } from '../../../lib/database.types';
import { isInvoiceRow, type InvoiceRow } from '../model';
import { nullableNumber, nullableText, record } from '../../campaigns/details/model';

export type InvoiceDetail = InvoiceRow & Pick<Database['public']['Tables']['advertiser_invoices']['Row'],
  'file_url' | 'sent_to' | 'price_per_play' | 'tariff_version' | 'paid_by'>;
export type PaymentReview = Pick<InvoiceDetail, 'id' | 'number' | 'user_id' | 'ad_id' | 'amount'>;
export type PaymentSummary = PaymentReview & { client: string; campaign: string };
export function isInvoiceDetail(value: unknown): value is InvoiceDetail {
  return record(value)
    && ['file_url', 'sent_to', 'paid_by'].every(key => nullableText(value[key]))
    && nullableNumber(value.price_per_play)
    && (value.tariff_version === null || typeof value.tariff_version === 'number' && Number.isSafeInteger(value.tariff_version)) && isInvoiceRow(value);
}
export function canReviewPayment(row: InvoiceDetail): boolean {
  return row.status === 'unpaid' && row.number !== null && row.amount !== null
    && Number.isFinite(row.amount) && Math.abs(row.amount) <= Number.MAX_SAFE_INTEGER;
}
export function matchesReview(row: InvoiceDetail | null | undefined, review: PaymentReview): boolean {
  return Boolean(row && canReviewPayment(row) && (['id', 'number', 'amount', 'user_id', 'ad_id'] as const).every(key => row[key] === review[key]));
}
/** Only absolute HTTP(S), no embedded credentials, backslashes or control characters. */
export function invoiceFileUrl(value: string | null): string | null {
  if (!value || !/^https?:\/\//i.test(value) || /[\s\\]/.test(value)
    || Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
