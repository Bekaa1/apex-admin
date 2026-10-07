import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { fetchTariffTerms } from './api';
import { demoTariffTerms, parseDemoVariant } from './demo';
import { queryKeys } from './queryKeys';
import type { TariffTerms } from './tariffs';

export type TariffTermsState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; terms: TariffTerms[]; refetch: () => Promise<unknown> };

const TERMS_STALE_MS = 5 * 60_000;

/** Minimums and versions of the plans on sale. The server checks them again, so a few minutes of staleness is fine. */
export function useTariffTerms(): TariffTermsState {
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV ? parseDemoVariant(params.get('demo')) : null;
  const query = useQuery({
    queryKey: queryKeys.tariffTerms(),
    queryFn: ({ signal }) => fetchTariffTerms(signal),
    enabled: !demo,
    staleTime: TERMS_STALE_MS,
  });
  if (demo) return { status: 'ready', terms: demoTariffTerms(), refetch: () => Promise.resolve() };
  if (query.isPending || (query.isError && query.isFetching)) return { status: 'loading' };
  if (query.isError) return { status: 'error', retry: () => void query.refetch() };
  return { status: 'ready', terms: query.data, refetch: query.refetch };
}
