import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { isStoreId } from '../model';
import { fetchStorePartner, fetchStoreRecord, fetchStoreRecords } from './api';
import { isStoreTab, validPage, type StoreTabSelection } from './model';

/** Used only below RequireAdmin. No previous-store placeholder data is retained. */
function useStoreQuery<T>(id: string, key: readonly unknown[], read: (signal: AbortSignal) => Promise<T>, valid = true) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'store-detail', session?.user.id, id, ...key],
    queryFn: ({ signal }) => read(signal),
    enabled: status === 'ready' && Boolean(session) && isStoreId(id) && valid,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
export function useStoreRecord(id: string) { return useStoreQuery(id, ['record'], signal => fetchStoreRecord(id, signal)); }
export function useStorePartner(id: string, partnerId: string) {
  return useStoreQuery(id, ['partner', partnerId], signal => fetchStorePartner(partnerId, signal), isStoreId(partnerId));
}
export function useStoreRecords(id: string, selection: StoreTabSelection) {
  return useStoreQuery(id, ['records', selection.tab, { withoutZone: selection.withoutZone }, selection.page], signal => fetchStoreRecords(id, selection, signal),
    !selection.error && isStoreTab(selection.tab) && validPage(selection.page));
}
