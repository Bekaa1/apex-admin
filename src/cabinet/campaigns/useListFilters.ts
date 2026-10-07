import { useSearchParams } from 'react-router';
import { parseFilters, writeFilters, type ListFilters } from './listFilters';

export function useListFilters(): { filters: ListFilters; update: (patch: Partial<ListFilters>) => void } {
  const [params, setParams] = useSearchParams();
  return {
    filters: parseFilters(params),
    update: (patch) => setParams((prev) => writeFilters(prev, { ...parseFilters(prev), ...patch }), { replace: true }),
  };
}
