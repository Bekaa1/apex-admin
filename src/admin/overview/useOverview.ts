import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import type { OverviewResult } from './model';

const prefix = (userId: string | undefined) => ['admin', 'overview', userId] as const;

/** Each mounted block starts its own independent query after RequireAdmin succeeds. */
export function useOverviewBlock<T>(block: string, fetcher: (signal: AbortSignal) => Promise<OverviewResult<T>>) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: [...prefix(session?.user.id), block],
    queryFn: ({ signal }) => fetcher(signal),
    enabled: status === 'ready' && Boolean(session),
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}

export function useRefreshOverview() {
  const { session } = useAuthSession();
  const client = useQueryClient();
  const queryKey = prefix(session?.user.id);
  const pending = useIsFetching({ queryKey }) > 0;
  return {
    pending,
    refresh: () => { if (!pending) void client.refetchQueries({ queryKey, type: 'active' }); },
  };
}
