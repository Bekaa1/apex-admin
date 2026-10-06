import { Alert } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { MODERATION_RULES } from '../rules';
import type { Moderation } from '../types';

/** Why the moderator returned the campaign; without the backend's moderation fields only the next step is shown. */
export function ReturnedAlert({ moderation }: { moderation: Moderation | null }) {
  const { t } = useI18n();
  const rules = (moderation?.rules ?? []).map((rule) => (MODERATION_RULES.includes(rule) ? t(`campaigns.rules.${rule}`) : rule));
  return (
    <Alert tone="danger" title={t('campaigns.wizard.fix.title')}>
      {rules.length ? `${t('campaigns.wizard.fix.failed', { rules: rules.join('; ') })} ` : null}
      {moderation?.comment ? `${t('campaigns.wizard.fix.comment', { comment: t('campaigns.row.comment', { text: moderation.comment }) })} ` : null}
      {t('campaigns.wizard.fix.after')}
    </Alert>
  );
}
