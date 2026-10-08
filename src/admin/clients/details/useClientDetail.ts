import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { clientsAccessConfigured } from '../access';
import { fetchClientProfile } from '../api';
import { CLIENT_PAGE_SIZE, isClientId } from '../model';
import { fetchClientCampaigns, fetchClientInvoices } from './api';

/** Mounted below RequireAdmin and (for tabs) only after the requested profile loads.
 * Separate client/viewer/page keys; no placeholder or previous-client data.
 * Existing campaign/invoice invalidations cover the scoped tab caches too.
 */
function useClientQuery<T>(id: string, kind: string, page: number, read: (signal: AbortSignal) => Promise<T>) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', kind, session?.user.id, 'client', id, page],
    queryFn: ({ signal }) => read(signal),
    enabled: clientsAccessConfigured() && status === 'ready' && Boolean(session) && isClientId(id)
      && Number.isSafeInteger(page) && page >= 1 && page <= Math.floor(Number.MAX_SAFE_INTEGER / CLIENT_PAGE_SIZE),
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}

export function useClientProfile(id: string) {
  return useClientQuery(id, 'client-profile', 1, signal => fetchClientProfile(id, signal));
}
export function useClientCampaigns(id: string, page: number) {
  return useClientQuery(id, 'campaigns', page, signal => fetchClientCampaigns(id, page, signal));
}
export function useClientInvoices(id: string, page: number) {
  return useClientQuery(id, 'invoices', page, signal => fetchClientInvoices(id, page, signal));
}
