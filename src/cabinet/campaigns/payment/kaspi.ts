import type { Tables } from '../../../lib/database.types';

// A static Kaspi Pay link: it takes no amount, invoice or return address and doesn't report payments back. The advertiser
// types the amount, and the accountant marks the invoice paid in the admin console — only then the campaign starts.
export const KASPI_PAY_URL = 'https://pay.kaspi.kz/pay/bqvk41pf';

export type InvoiceSource = Pick<Tables<'advertiser_invoices'>, 'number' | 'amount' | 'status' | 'issued_at'>;

export interface InvoiceToPay {
  number: number;
  amount: number;
  paid: boolean;
}

/** The latest unpaid invoice of a campaign; once none is left, the latest paid one, to show that the payment went through. */
export function invoiceToPay(rows: InvoiceSource[]): InvoiceToPay | null {
  const byDate = [...rows].sort((a, b) => a.issued_at.localeCompare(b.issued_at));
  const row = byDate.findLast((invoice) => invoice.status === 'unpaid') ?? byDate.findLast((invoice) => invoice.status === 'paid');
  return row ? { number: row.number, amount: row.amount, paid: row.status === 'paid' } : null;
}
