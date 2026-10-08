import './home.css';
import { useI18n } from '../../i18n/i18n';
import { LoadError } from '../ui/LoadError';
import { useTariffTerms } from '../useTariffTerms';
import { HomeDashboard } from './HomeDashboard';
import { HomeGuide } from './HomeGuide';
import { HomeSkeleton } from './HomeSkeleton';
import { useHomeState } from './useHomeState';

export function HomePage() {
  const { t } = useI18n();
  const state = useHomeState();
  const tariffs = useTariffTerms();
  // The plan cards show «—» instead of the minimum until the terms arrive; the guide doesn't wait for them.
  const terms = tariffs.status === 'ready' ? tariffs.terms : null;
  if (state.status === 'loading') return <HomeSkeleton />;
  if (state.status === 'error') {
    return (
      <LoadError title={t('home.summary.errorTitle')} onRetry={state.retry}>
        {t('home.summary.errorText')}
      </LoadError>
    );
  }
  return state.data.isNew ? <HomeGuide tariffTerms={terms} /> : <HomeDashboard data={state.data} tariffTerms={terms} />;
}
