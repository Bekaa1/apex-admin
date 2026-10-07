import { Alert, Skeleton } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { CABINET_LINKS } from '../../sections';
import { ButtonLink } from '../../ui/ButtonLink';
import { LoadError } from '../../ui/LoadError';
import { CampaignWizard } from './CampaignWizard';
import { formStorageKey, loadForm } from './formStorage';
import { emptyForm } from './reducer';
import type { WizardMode } from './types';
import { useWizardData, type WizardSource } from './useWizardData';

function WizardSkeleton() {
  const { t } = useI18n();
  return (
    <div className="cmp-wizard" aria-busy="true" aria-label={t('campaigns.wizard.loading')}>
      <Skeleton width={140} height={20} />
      <Skeleton variant="block" width="100%" height={84} />
      <div className="cmp-wizard__grid">
        <Skeleton variant="block" width="100%" height={420} />
        <Skeleton variant="block" width="100%" height={280} />
      </div>
    </div>
  );
}

/** Loads stores, zones and the source campaign, then opens the wizard with the saved form, the campaign or an empty form. */
export function WizardScreen({ source }: { source: WizardSource }) {
  const { t } = useI18n();
  const data = useWizardData(source);

  if (data.status === 'loading') return <WizardSkeleton />;
  if (data.status === 'error') {
    return (
      <LoadError title={t('campaigns.wizard.loadError.title')} onRetry={data.retry}>
        {t('campaigns.wizard.loadError.text')}
      </LoadError>
    );
  }
  if (data.status === 'missing') {
    return (
      <div className="cab-stack cab-stack--tight">
        <Alert
          tone="warning"
          title={t('campaigns.wizard.missing.title')}
          action={
            <ButtonLink to={CABINET_LINKS.campaigns} variant="secondary" size="md">
              {t('campaigns.wizard.back')}
            </ButtonLink>
          }
        >
          {t('campaigns.wizard.missing.text')}
        </Alert>
      </div>
    );
  }

  const mode: WizardMode = source.kind === 'fix' ? { kind: 'fix', campaignId: source.campaignId, moderation: data.moderation } : { kind: 'new' };
  const storageKey = formStorageKey(data.userId, mode);
  // A copy always starts from the source campaign; otherwise what was typed in this tab wins.
  const initial = (source.kind === 'copy' ? null : loadForm(storageKey)) ?? data.prefill ?? emptyForm();
  return <CampaignWizard key={storageKey} userId={data.userId} initial={initial} catalog={data.catalog} mode={mode} storageKey={storageKey} api={data.api} />;
}
