import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { clientsAccessConfigured } from './access';
import { fetchClientPage } from './api';
import type { ClientSelection } from './model';

/** RequireAdmin must allow mounting, and independent source/scope evidence is required. */
export function useClients(selection: ClientSelection) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'clients', session?.user.id, selection],
    queryFn: ({ signal }) => fetchClientPage(selection, signal),
    enabled: clientsAccessConfigured() && status === 'ready' && Boolean(session) && !selection.error,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
