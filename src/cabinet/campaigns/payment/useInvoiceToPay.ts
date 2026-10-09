import { skipToken, useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { queryKeys } from '../../queryKeys';
import { fetchCampaignInvoices } from '../api';
import { invoiceToPay, type InvoiceToPay } from './kaspi';

export type InvoiceToPayState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; invoice: InvoiceToPay | null };

/** The Kaspi button is offered only for an invoice known to be unpaid, so a paid one isn't paid twice. */
export function canPay(state: InvoiceToPayState): boolean {
  return state.status === 'ready' && state.invoice !== null && !state.invoice.paid;
}

// The accountant confirms payments by hand, so a minute between checks is enough.
const UNPAID_POLL_MS = 60_000;

/**
 * The invoice the advertiser pays in Kaspi and whether it is paid. Kaspi opens in another tab, so the status is read again
 * when the advertiser comes back to this one, and every minute while it is unpaid. Nothing is read without a campaign.
 */
export function useInvoiceToPay(campaignId: string | null, demoAmount: number): InvoiceToPayState {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  // The demo wizard «sends» to `demo-sent`, which has no invoice in the database.
  const demo = import.meta.env.DEV && Boolean(campaignId?.startsWith('demo'));
  const query = useQuery({
    queryKey: queryKeys.campaignInvoices(userId, campaignId ?? ''),
    queryFn: userId && campaignId && !demo ? ({ signal }) => fetchCampaignInvoices(campaignId, signal) : skipToken,
    select: invoiceToPay,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (state) => (state.state.data && invoiceToPay(state.state.data)?.paid === false ? UNPAID_POLL_MS : false),
  });

  if (demo) return { status: 'ready', invoice: { number: 1042, amount: demoAmount, paid: false } };
  if (!userId || query.isPending || (query.isError && query.isFetching)) return { status: 'loading' };
  if (query.isError) return { status: 'error', retry: () => void query.refetch() };
  return { status: 'ready', invoice: query.data };
}
