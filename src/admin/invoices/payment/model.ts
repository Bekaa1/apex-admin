import { isInvoiceId } from '../model';
import type { Database } from '../../../lib/database.types';

export type PaymentIssue = 'not_authenticated' | 'forbidden' | 'not_found' | 'invalid_status' | 'changed'
  | 'unavailable' | 'uncertain' | 'refresh_failed' | 'unverified';
export class PaymentError extends Error {
  readonly kind: PaymentIssue;
  constructor(kind: PaymentIssue) { super('Administrative payment confirmation failed'); this.name = 'PaymentError'; this.kind = kind; }
}
export function paymentArgs(id: string): Database['public']['Functions']['admin_mark_invoice_paid']['Args'] {
  if (!isInvoiceId(id)) throw new PaymentError('not_found');
  return { p_invoice_id: id };
}
/** Sanitize server errors. Unknown errors can happen after a committed transaction. */
export function paymentIssue(error: unknown, status?: number): PaymentIssue {
  if (error instanceof PaymentError) return error.kind;
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  for (const kind of ['not_authenticated', 'forbidden', 'not_found', 'invalid_status'] as const) {
    if ([value.code, value.message].some(text => typeof text === 'string' && new RegExp(`\\b${kind}\\b`).test(text))) return kind;
  }
  if (status === 401 || value.code === 'PGRST301') return 'not_authenticated';
  if (status === 403 || value.code === '42501') return 'forbidden';
  if (['PGRST202', '42883'].includes(String(value.code))) return 'unavailable';
  return 'uncertain';
}
