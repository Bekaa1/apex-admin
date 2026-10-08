import { Alert } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney } from '../../lib/format';
import { CABINET_LINKS } from '../sections';
import { ButtonLink } from '../ui/ButtonLink';
import type { CampaignItem } from './types';

export function LowBudgetAlert({ campaign }: { campaign: CampaignItem }) {
  const { t, lang } = useI18n();
  return (
    <Alert
      tone="warning"
      title={t('home.lowBudget.title', { name: campaign.name })}
      action={
        <ButtonLink to={CABINET_LINKS.campaignTopUp(campaign.id)} variant="secondary" size="md" iconLeft="plus">
          {t('home.lowBudget.topUp')}
        </ButtonLink>
      }
    >
      {t('home.lowBudget.text', { amount: formatMoney(campaign.left, lang) })}
    </Alert>
  );
}
