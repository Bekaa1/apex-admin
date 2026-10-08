import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchInvoicePage } from './api';
import type { InvoiceSelection } from './model';

/** Page mounts only in RequireAdmin's successful Outlet. */
export function useInvoices(selection: InvoiceSelection) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'invoices', session?.user.id, selection],
    queryFn: ({ signal }) => fetchInvoicePage(selection, signal),
    enabled: status === 'ready' && Boolean(session) && !selection.error,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
