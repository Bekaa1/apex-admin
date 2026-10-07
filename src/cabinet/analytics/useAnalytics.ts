import { skipToken, useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchAnalyticsSource, fetchStoreZones } from './api';
import { buildAnalyticsCatalog, buildStoreZones } from './model';

export function useAnalytics() {
  const { session } = useAuthSession();
  return useQuery({
    queryKey: ['analytics', session?.user.id, 'catalog'],
    queryFn: session ? ({ signal }) => fetchAnalyticsSource(signal) : skipToken,
    select: buildAnalyticsCatalog,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useStoreZones(storeId: string | undefined) {
  const { session } = useAuthSession();
  return useQuery({
    queryKey: ['analytics', session?.user.id, 'zones', storeId],
    queryFn: session && storeId ? ({ signal }) => fetchStoreZones(storeId, signal) : skipToken,
    select: buildStoreZones,
  });
}
