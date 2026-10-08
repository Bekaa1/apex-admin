import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { fetchEquipment } from './api';
import type { EquipmentSelection } from './model';

/** Only mounted under RequireAdmin; each tab/filter/page has its own session-scoped key. */
export function useEquipment(selection: EquipmentSelection) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'equipment', session?.user.id, selection.tab, selection.filters, selection.page],
    queryFn: ({ signal }) => fetchEquipment(selection, signal),
    enabled: status === 'ready' && Boolean(session) && !selection.error,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
