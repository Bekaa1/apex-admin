import { skipToken, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useAuthSession } from '../../../auth/useAuthSession';
import { parseDemoVariant } from '../../demo';
import { queryKeys } from '../../queryKeys';
import { fetchCampaignDetails, fetchStoreCatalog } from '../api';
import { demoCatalog } from '../wizard/demo';
import type { StoreCatalog } from '../wizard/types';
import { demoDetailsSource } from './demo';
import type { CampaignDetailsSource } from './types';

export type CampaignDetailsState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'missing' }
  | { status: 'ready'; userId: string; source: CampaignDetailsSource; catalog: StoreCatalog; refetch: () => Promise<unknown> };

const CATALOG_STALE_MS = 5 * 60_000;

/** The campaign, its plays and invoices, and the store catalog for addresses. Shared by the card and the top-up screen. */
export function useCampaignDetails(campaignId: string): CampaignDetailsState {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV ? parseDemoVariant(params.get('demo')) : null;

  const details = useQuery({
    queryKey: queryKeys.campaignDetails(userId, campaignId),
    queryFn: userId && !demo ? ({ signal }) => fetchCampaignDetails(campaignId, signal) : skipToken,
    // Back from Kaspi in another tab: the invoice may have been marked paid meanwhile.
    refetchOnWindowFocus: true,
  });
  const catalog = useQuery({
    queryKey: queryKeys.storeCatalog(userId),
    queryFn: userId && !demo ? ({ signal }) => fetchStoreCatalog(signal) : skipToken,
    staleTime: CATALOG_STALE_MS,
  });

  if (demo === 'loading') return { status: 'loading' };
  if (demo === 'error') return { status: 'error', retry: () => window.location.reload() };
  if (demo) {
    const source = demo === 'new' ? null : demoDetailsSource(campaignId);
    return source ? { status: 'ready', userId: 'demo', source, catalog: demoCatalog(), refetch: () => Promise.resolve() } : { status: 'missing' };
  }

  const failed = details.isError || catalog.isError;
  const busy = details.isFetching || catalog.isFetching;
  if (!userId || details.isPending || catalog.isPending || (failed && busy)) return { status: 'loading' };
  if (failed) {
    return {
      status: 'error',
      retry: () => {
        void details.refetch();
        void catalog.refetch();
      },
    };
  }
  if (!details.data) return { status: 'missing' };
  return { status: 'ready', userId, source: details.data, catalog: catalog.data, refetch: details.refetch };
}
