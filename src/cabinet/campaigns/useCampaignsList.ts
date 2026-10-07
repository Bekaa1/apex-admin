import { skipToken, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useAuthSession } from '../../auth/useAuthSession';
import { parseDemoVariant } from '../demo';
import { queryKeys } from '../queryKeys';
import { fetchCampaignsSource } from './api';
import { demoCampaignsState } from './demo';
import { buildCampaignCards } from './model';
import type { CampaignsListState } from './types';

/** Campaigns of the signed-in advertiser; dev builds can preview every state with ?demo=. */
export function useCampaignsList(): CampaignsListState {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV ? parseDemoVariant(params.get('demo')) : null;

  const query = useQuery({
    queryKey: queryKeys.campaignList(userId),
    queryFn: userId && !demo ? ({ signal }) => fetchCampaignsSource(signal) : skipToken,
    select: buildCampaignCards,
  });

  if (demo) return demoCampaignsState(demo);
  if (query.isPending || (query.isError && query.isFetching)) return { status: 'loading' };
  if (query.isError) return { status: 'error', retry: () => void query.refetch() };
  return { status: 'ready', cards: query.data };
}
