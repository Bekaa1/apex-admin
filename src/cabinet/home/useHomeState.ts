import { skipToken, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useAuthSession } from '../../auth/useAuthSession';
import { parseDemoVariant } from '../demo';
import { queryKeys } from '../queryKeys';
import { fetchHomeSource } from './api';
import { demoHomeState } from './demo';
import { buildHomeData } from './model';
import type { HomeState } from './types';

/** Home data for the signed-in advertiser; dev builds can preview every state with ?demo=. */
export function useHomeState(): HomeState {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV ? parseDemoVariant(params.get('demo')) : null;

  const query = useQuery({
    queryKey: queryKeys.home(userId),
    queryFn: userId && !demo ? ({ signal }) => fetchHomeSource(userId, signal) : skipToken,
    select: buildHomeData,
  });

  if (demo) return demoHomeState(demo);
  if (query.isPending || (query.isError && query.isFetching)) return { status: 'loading' };
  if (query.isError) return { status: 'error', retry: () => void query.refetch() };
  return { status: 'ready', data: query.data };
}
