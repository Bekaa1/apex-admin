import { requireSupabase } from '../../../lib/supabase';
import { paymentArgs, PaymentError, paymentIssue } from './model';

export async function markInvoicePaid(id: string): Promise<void> {
  const args = paymentArgs(id);
  try {
    const { error, status } = await requireSupabase().rpc('admin_mark_invoice_paid', args)
      .retry(false).abortSignal(AbortSignal.timeout(30_000));
    if (error) throw new PaymentError(paymentIssue(error, status));
    // Ignore the returned string; only a subsequent SELECT can confirm paid.
  } catch (error) { throw new PaymentError(paymentIssue(error)); }
}
