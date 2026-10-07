import '../campaigns.css';
import { Link, Navigate, useParams } from 'react-router';
import { Alert, Icon, Skeleton } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { CABINET_LINKS } from '../../sections';
import { ButtonLink } from '../../ui/ButtonLink';
import { LoadError } from '../../ui/LoadError';
import { useAccount } from '../../useAccount';
import { daysFor } from '../details/model';
import { useCampaignDetails } from '../details/useCampaignDetails';
import { buildTopUp, type TopUpCampaign, type TopUpTerms } from './model';
import { TopUpForm } from './TopUpForm';
import { TopUpSummary } from './TopUpSummary';
import { useTopUp } from './useTopUp';

interface TopUpScreenProps {
  userId: string;
  campaign: TopUpCampaign;
  terms: TopUpTerms;
  refetch: () => Promise<unknown>;
}

function TopUpScreen({ userId, campaign, terms, refetch }: TopUpScreenProps) {
  const { contact } = useAccount();
  const email = campaign.email ?? contact ?? '';
  const form = useTopUp({ userId, campaign, terms, email, refetch });
  return (
    <div className="cmp-wizard__grid">
      <form
        className="cmp-wizard__main"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          form.submit();
        }}
      >
        <TopUpForm campaign={campaign} terms={terms} form={form} email={email} />
      </form>
      <aside className="cmp-wizard__aside">
        <TopUpSummary amount={form.amount} days={daysFor(campaign.money.left + (form.amount ?? 0), campaign.spendPerDay)} email={email} />
      </aside>
    </div>
  );
}

function TopUpContent({ campaignId }: { campaignId: string }) {
  const { t } = useI18n();
  const state = useCampaignDetails(campaignId);
  if (state.status === 'loading') {
    return (
      <div className="cmp-wizard__grid" aria-busy="true" aria-label={t('campaigns.details.loading')}>
        <Skeleton variant="block" width="100%" height={480} />
        <Skeleton variant="block" width="100%" height={280} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <LoadError title={t('campaigns.details.error.title')} onRetry={state.retry}>
        {t('campaigns.details.error.text')}
      </LoadError>
    );
  }
  const model = state.status === 'ready' ? buildTopUp(state.source) : null;
  if (state.status !== 'ready' || !model || model.status === 'blocked') {
    const reason = model?.status === 'blocked' ? model.reason : 'missing';
    return (
      <Alert
        tone="warning"
        title={t(`campaigns.topUp.blocked.${reason}.title`)}
        action={
          <ButtonLink to={reason === 'missing' ? CABINET_LINKS.campaigns : CABINET_LINKS.campaign(campaignId)} variant="secondary" size="md">
            {t(reason === 'missing' ? 'campaigns.wizard.back' : 'campaigns.topUp.back')}
          </ButtonLink>
        }
      >
        {t(`campaigns.topUp.blocked.${reason}.text`)}
      </Alert>
    );
  }
  return <TopUpScreen userId={state.userId} campaign={model.campaign} terms={model.terms} refetch={state.refetch} />;
}

/** «Пополнение кампании»: a new invoice for the same campaign, no moderation. */
export function TopUpPage() {
  const { t } = useI18n();
  const { campaignId } = useParams();
  if (!campaignId) return <Navigate to={CABINET_LINKS.campaigns} replace />;
  return (
    <div className="cmp-wizard cmpt">
      <Link className="cab-link cmp-back" to={CABINET_LINKS.campaign(campaignId)}>
        <Icon name="arrow-left" size={18} />
        {t('campaigns.topUp.back')}
      </Link>
      <TopUpContent key={campaignId} campaignId={campaignId} />
    </div>
  );
}
