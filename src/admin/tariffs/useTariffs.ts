import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchTariffs } from './api';
import type { TariffSelection } from './model';

/** Mounted exclusively in RequireAdmin's successful outlet. */
export function useTariffs(selection: TariffSelection) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'tariffs', session?.user.id, selection.filters, selection.page],
    queryFn: ({ signal }) => fetchTariffs(selection, signal),
    enabled: status === 'ready' && Boolean(session) && !selection.error,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
