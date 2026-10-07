import './campaigns.css';
import { useI18n } from '../../i18n/i18n';
import { LoadError } from '../ui/LoadError';
import { useTariffTerms } from '../useTariffTerms';
import { CampaignsEmpty } from './list/CampaignsEmpty';
import { CampaignsList } from './list/CampaignsList';
import { CampaignsSkeleton } from './list/CampaignsSkeleton';
import { useCampaignsList } from './useCampaignsList';

export function CampaignsPage() {
  const { t } = useI18n();
  const state = useCampaignsList();
  const tariffs = useTariffTerms();
  const minimum = tariffs.status === 'ready' && tariffs.terms.length ? Math.min(...tariffs.terms.map((plan) => plan.minimum)) : null;
  if (state.status === 'loading') return <CampaignsSkeleton />;
  if (state.status === 'error') {
    return (
      <LoadError title={t('campaigns.error.title')} onRetry={state.retry}>
        {t('campaigns.error.text')}
      </LoadError>
    );
  }
  return state.cards.length ? <CampaignsList cards={state.cards} /> : <CampaignsEmpty minimum={minimum} />;
}
