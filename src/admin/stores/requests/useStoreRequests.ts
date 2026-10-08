import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { fetchRequests } from './api';
import type { ListSelection } from './model';

/** Rendered only by RequireAdmin's successful Outlet. Search/pages never trigger RPCs. */
export function useStoreRequests(selection: ListSelection) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'store-requests', session?.user.id, selection.status],
    queryFn: ({ signal }) => fetchRequests(selection.status, signal),
    enabled: status === 'ready' && Boolean(session) && !selection.invalid,
    retry: false, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: false, refetchOnReconnect: false,
    // One response per selected status; local pages reuse it. Remounting after the wizard refreshes it.
  });
}
