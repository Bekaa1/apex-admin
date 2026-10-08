import { requireSupabase } from '../../../lib/supabase';
import { InvoiceReadError, responseError } from '../api';
import { isInvoiceId } from '../model';
import { isInvoiceDetail, type InvoiceDetail } from './model';

export async function fetchInvoiceDetail(id: string, signal: AbortSignal): Promise<InvoiceDetail | null> {
  if (!isInvoiceId(id)) throw new InvoiceReadError('invalid');
  try {
    const { data, error, status } = await requireSupabase().from('advertiser_invoices')
      .select('id,number,user_id,ad_id,kind,amount,status,issued_at,paid_at,file_url,sent_to,price_per_play,tariff_version,paid_by')
      .eq('id', id).abortSignal(signal).maybeSingle();
    responseError(error, status);
    if (data === null) return null;
    if (!isInvoiceDetail(data) || data.id !== id) throw new InvoiceReadError('invalid');
    return data;
  } catch (error) {
    if (error instanceof InvoiceReadError) throw error;
    throw new InvoiceReadError('unavailable');
  }
}
