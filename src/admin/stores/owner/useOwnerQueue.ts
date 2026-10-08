import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { getOwnerQueue } from './api';

/** Only mounted by RequireStoreOwner's successful outlet. */
export function useOwnerQueue() {
  const { session, status } = useAuthSession();
  return useQuery({ queryKey: ['admin', 'store-owner-queue', session?.user.id],
    queryFn: ({ signal }) => getOwnerQueue(signal), enabled: status === 'ready' && Boolean(session),
    retry: false, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: false, refetchOnReconnect: false });
}
