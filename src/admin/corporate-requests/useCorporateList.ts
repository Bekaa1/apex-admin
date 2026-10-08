import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchCorporatePage } from './api';
import type { CorporateSelection } from './listModel';

/** Mounted only inside RequireAdmin's successful Outlet. */
export function useCorporateList(selection: CorporateSelection) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'corporate-list', session?.user.id, selection],
    queryFn: ({ signal }) => fetchCorporatePage(selection, signal),
    enabled: status === 'ready' && Boolean(session) && !selection.error,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
