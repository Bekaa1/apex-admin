import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { isInvoiceId } from '../model';

/** Only mounted inside RequireAdmin; auxiliary reads wait for the invoice. */
export function useInvoiceDetailQuery<T>(id: string, key: readonly unknown[], fetch: (signal: AbortSignal) => Promise<T>) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'invoice-detail', session?.user.id, id, ...key],
    queryFn: ({ signal }) => fetch(AbortSignal.any([signal, AbortSignal.timeout(15_000)])),
    enabled: status === 'ready' && Boolean(session) && isInvoiceId(id),
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
