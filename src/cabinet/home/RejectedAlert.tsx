import { Alert } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { CABINET_LINKS } from '../sections';
import { ButtonLink } from '../ui/ButtonLink';
import type { CampaignItem } from './types';

/** The moderator returned a campaign: the reason is in «Исправить» and on the campaign card. */
export function RejectedAlert({ campaign }: { campaign: CampaignItem }) {
  const { t } = useI18n();
  return (
    <Alert
      tone="danger"
      title={t('home.rejected.title', { name: campaign.name })}
      action={
        <ButtonLink to={CABINET_LINKS.campaignEdit(campaign.id)} variant="secondary" size="md" iconLeft="pencil">
          {t('home.rejected.fix')}
        </ButtonLink>
      }
    >
      {t('home.rejected.text')}
    </Alert>
  );
}
