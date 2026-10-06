import { useSearchParams } from 'react-router';
import { parseDemoVariant } from '../demo';
import { demoHomeState } from './demo';
import { buildHomeData } from './model';
import type { HomeState } from './types';

const NO_DATA: HomeState = {
  status: 'ready',
  data: buildHomeData({ campaigns: [], summary: null, dailyPlays: [], extras: [], stores: [] }),
};

/**
 * Data for Home. The Supabase client and session come with the auth flow; until they land,
 * Home has no data source and shows the new-user guide (dev builds can preview every state with ?demo=).
 */
export function useHomeState(): HomeState {
  const [params] = useSearchParams();
  const demo = parseDemoVariant(params.get('demo'));
  if (import.meta.env.DEV && demo) return demoHomeState(demo);
  return NO_DATA;
}
