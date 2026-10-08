import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { isCampaignId } from '../model';

/** Mounted only in RequireAdmin's allowed subtree; related reads wait for the main record. */
export function useCampaignDetailQuery<T>(id: string | undefined, key: readonly unknown[], fetch: (signal: AbortSignal) => Promise<T>) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'campaign-detail', session?.user.id, id, ...key],
    queryFn: ({ signal }) => fetch(signal),
    enabled: status === 'ready' && Boolean(session) && isCampaignId(id),
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
