import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchCorporateRequest } from '../overview/api';
import { isRequestId } from './model';

/** Only mounted beneath RequireAdmin's successful Outlet, including direct URLs. */
export function useCorporateRequest(id: string | undefined) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'corporate-request', session?.user.id, id],
    queryFn: ({ signal }) => fetchCorporateRequest(id ?? '', signal),
    enabled: status === 'ready' && Boolean(session) && isRequestId(id),
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
