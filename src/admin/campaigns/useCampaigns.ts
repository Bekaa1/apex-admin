import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchCampaignPage } from './api';
import type { CampaignMode, CampaignSelection } from './model';

/** Only mounted by the page inside RequireAdmin's successful Outlet. */
export function useCampaigns(selection: CampaignSelection, mode: CampaignMode = 'all') {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'campaigns', session?.user.id, mode, selection],
    queryFn: ({ signal }) => fetchCampaignPage(selection, signal, mode),
    enabled: status === 'ready' && Boolean(session) && !selection.error,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
