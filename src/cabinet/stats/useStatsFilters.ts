import { useSearchParams } from 'react-router';
import { parseStatsFilters, writeStatsFilters } from './filters';
import type { StatsFilters } from './types';

export function useStatsFilters(): { filters: StatsFilters; update: (patch: Partial<StatsFilters>) => void; linkTo: (patch: Partial<StatsFilters>) => string } {
  const [params, setParams] = useSearchParams();
  const filters = parseStatsFilters(params);
  return {
    filters,
    update: (patch) => setParams((prev) => writeStatsFilters(prev, { ...parseStatsFilters(prev), ...patch }), { replace: true, preventScrollReset: true }),
    linkTo: (patch) => `?${writeStatsFilters(params, { ...filters, ...patch }).toString()}`,
  };
}
