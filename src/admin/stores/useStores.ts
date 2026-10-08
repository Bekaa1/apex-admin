import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchStorePage } from './api';
import type { StoreSelection } from './model';

/** This page mounts only inside RequireAdmin's successful Outlet. */
export function useStores(selection: StoreSelection) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'stores', session?.user.id, selection],
    queryFn: ({ signal }) => fetchStorePage(selection, signal),
    enabled: status === 'ready' && Boolean(session) && !selection.error,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
