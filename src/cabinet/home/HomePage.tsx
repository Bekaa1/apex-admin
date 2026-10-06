import './home.css';
import { HomeDashboard } from './HomeDashboard';
import { HomeError } from './HomeError';
import { HomeGuide } from './HomeGuide';
import { HomeSkeleton } from './HomeSkeleton';
import { useHomeState } from './useHomeState';

export function HomePage() {
  const state = useHomeState();
  if (state.status === 'loading') return <HomeSkeleton />;
  if (state.status === 'error') return <HomeError onRetry={state.retry} />;
  return state.data.isNew ? <HomeGuide /> : <HomeDashboard data={state.data} />;
}
