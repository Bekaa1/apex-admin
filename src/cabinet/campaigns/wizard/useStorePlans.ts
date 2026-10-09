import { skipToken, useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../queryKeys';
import { toStoreMap, type StoreMap } from './storePlan';
import type { WizardApi } from './types';

export type StorePlansState =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; maps: StoreMap[] };

const PLANS_STALE_MS = 5 * 60_000;

/** Floor plans of the chosen stores, read only while the zones step is open. A plan that doesn't pass the checks is dropped. */
export function useStorePlans(userId: string, api: WizardApi, storeIds: string[], enabled: boolean): StorePlansState {
  const ids = [...storeIds].sort();
  const active = enabled && ids.length > 0;
  const query = useQuery({
    queryKey: queryKeys.storePlans(userId, ids),
    queryFn: active ? async ({ signal }) => (await api.storePlans(ids, signal)).flatMap((source) => toStoreMap(source) ?? []) : skipToken,
    staleTime: PLANS_STALE_MS,
    // Maps of a thousand shelves: comparing them deeply on every refetch buys nothing.
    structuralSharing: false,
  });

  if (!active) return { status: 'off' };
  if (query.isPending || (query.isError && query.isFetching)) return { status: 'loading' };
  if (query.isError) return { status: 'error', retry: () => void query.refetch() };
  return { status: 'ready', maps: query.data };
}
