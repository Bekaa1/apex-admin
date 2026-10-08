import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { isStoreId } from '../model';
import { getRequest } from './api';
import { requestKey } from './model';

/** Mounted only inside RequireAdmin; request/user changes never retain old form data. */
export function useStoreRequest(id: string | undefined) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: requestKey(session?.user.id ?? '', id ?? ''),
    queryFn: ({ signal }) => getRequest(id!, signal),
    enabled: status === 'ready' && Boolean(session) && isStoreId(id),
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
}
