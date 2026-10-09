import '../campaigns.css';
import { Link, Navigate, useParams } from 'react-router';
import { Alert, Button, Icon, Skeleton } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { SUPPORT_WHATSAPP_URL } from '../../../lib/contacts';
import { CABINET_LINKS } from '../../sections';
import { ButtonLink } from '../../ui/ButtonLink';
import { LoadError } from '../../ui/LoadError';
import { DetailsBudget } from './DetailsBudget';
import { DetailsHead } from './DetailsHead';
import { DetailsHistory } from './DetailsHistory';
import { DetailsMedia } from './DetailsMedia';
import { DetailsNow } from './DetailsNow';
import { DetailsPayment } from './DetailsPayment';
import { DetailsStats } from './DetailsStats';
import { DetailsStores } from './DetailsStores';
import { buildCampaignDetails } from './model';
import type { CampaignDetails } from './types';
import { useCampaignDetails } from './useCampaignDetails';

function BackLink() {
  const { t } = useI18n();
  return (
    <Link className="cab-link cmp-back" to={CABINET_LINKS.campaigns}>
      <Icon name="arrow-left" size={18} />
      {t('campaigns.wizard.back')}
    </Link>
  );
}

function DetailsSkeleton() {
  const { t } = useI18n();
  return (
    <div className="cab-stack cab-stack--tight" aria-busy="true" aria-label={t('campaigns.details.loading')}>
      <Skeleton variant="block" width="100%" height={130} />
      <div className="cmpd__grid">
        <div className="cmpd__main">
          <Skeleton variant="block" width="100%" height={320} />
          <Skeleton variant="block" width="100%" height={200} />
        </div>
        <div className="cmpd__aside">
          <Skeleton variant="block" width="100%" height={220} />
        </div>
      </div>
    </div>
  );
}

function DetailsHelp() {
  const { t } = useI18n();
  return (
    <section className="cab-card cmp-aside-card cmpd-help" aria-label={t('campaigns.details.help.title')}>
      <div className="cmp-aside-card__head">
        <span className="cab-tile cab-tile--brand cab-tile--sm" aria-hidden="true">
          <Icon name="message-circle" size={20} />
        </span>
        <h3 className="cmp-aside-card__title">{t('campaigns.details.help.title')}</h3>
      </div>
      <p className="cab-small">{t('campaigns.details.help.text')}</p>
      <Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="secondary" size="md" iconLeft="message-circle">
        {t('campaigns.wizard.help.budget.whatsapp')}
      </Button>
    </section>
  );
}

function CampaignDetailsView({ details }: { details: CampaignDetails }) {
  return (
    <>
      <DetailsHead details={details} />
      <DetailsNow details={details} />
      <DetailsPayment details={details} />
      <div className="cmpd__grid">
        <div className="cmpd__main">
          <DetailsStats details={details} />
          <DetailsMedia details={details} />
          <DetailsStores details={details} />
        </div>
        <div className="cmpd__aside">
          <DetailsBudget details={details} />
          <DetailsHistory details={details} />
          <DetailsHelp />
        </div>
      </div>
    </>
  );
}

function CampaignDetailsScreen({ campaignId }: { campaignId: string }) {
  const { t } = useI18n();
  const state = useCampaignDetails(campaignId);
  if (state.status === 'loading') return <DetailsSkeleton />;
  if (state.status === 'error') {
    return (
      <LoadError title={t('campaigns.details.error.title')} onRetry={state.retry}>
        {t('campaigns.details.error.text')}
      </LoadError>
    );
  }
  const details = state.status === 'ready' ? buildCampaignDetails(state.source, state.catalog) : null;
  if (!details) {
    return (
      <Alert
        tone="warning"
        title={t('campaigns.details.missing.title')}
        action={
          <ButtonLink to={CABINET_LINKS.campaigns} variant="secondary" size="md">
            {t('campaigns.wizard.back')}
          </ButtonLink>
        }
      >
        {t('campaigns.details.missing.text')}
      </Alert>
    );
  }
  return <CampaignDetailsView details={details} />;
}

/** «Карточка кампании»: what happens now, statistics, video, stores and zones, budget and history. */
export function CampaignDetailsPage() {
  const { campaignId } = useParams();
  if (!campaignId) return <Navigate to={CABINET_LINKS.campaigns} replace />;
  return (
    <div className="cab-stack cab-stack--tight cmpd">
      <BackLink />
      <CampaignDetailsScreen key={campaignId} campaignId={campaignId} />
    </div>
  );
}
