import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useAuthSession } from '../../auth/useAuthSession';
import { parseDemoVariant } from '../demo';
import { queryKeys } from '../queryKeys';
import { fetchStatsSource } from './api';
import { demoStatsState } from './demo';
import { buildStatsView } from './model';
import { selectStats } from './selection';
import type { StatsFilters, StatsRangeSource, StatsState } from './types';

/** Plays by hour and carts per period come from backend RPCs that are not there yet (session-log, 07.10). */
const NO_RANGE_DATA: StatsRangeSource = { hours: null, worked: null };

/** Statistics of the signed-in advertiser for the filters; dev builds can preview every state with ?demo=. */
export function useStats(filters: StatsFilters): StatsState {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV ? parseDemoVariant(params.get('demo')) : null;

  const query = useQuery({
    queryKey: queryKeys.stats(userId),
    queryFn: userId && !demo ? ({ signal }) => fetchStatsSource(signal) : skipToken,
  });
  const { campaignId, period, scope, step } = filters;
  const view = useMemo(() => {
    if (!query.data) return null;
    const current = { campaignId, period, scope, step };
    return buildStatsView(query.data, NO_RANGE_DATA, selectStats(query.data, current), current);
  }, [query.data, campaignId, period, scope, step]);

  if (demo) return demoStatsState(demo, filters);
  if (query.isPending || (query.isError && query.isFetching)) return { status: 'loading' };
  if (query.isError || !view) return { status: 'error', retry: () => void query.refetch() };
  return { status: 'ready', view };
}
