import { Alert } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { CABINET_LINKS } from '../../sections';
import { ButtonLink } from '../../ui/ButtonLink';

// The server repeats the wizard's checks, so these show up when something changed meanwhile: a store left the catalog,
// the session ended, the campaign was already fixed.
const KNOWN_CODES = [
  'invalid_name',
  'invalid_description',
  'invalid_tariff',
  'invalid_video',
  'invalid_cover',
  'invalid_stores',
  'invalid_zones',
  'invalid_budget',
  'invalid_daily_limit',
  'missing_email',
  'not_found',
  'invalid_status',
  'tariff_change_not_allowed',
  'tariff_changed',
  'not_authenticated',
];

/** Why the campaign wasn't sent. Without an email in the profile the invoice has nowhere to go, so that one links to it. */
export function SubmitError({ code }: { code: string }) {
  const { t } = useI18n();
  return (
    <Alert
      tone="danger"
      title={t('campaigns.wizard.submitError.title')}
      action={
        code === 'missing_email' ? (
          <ButtonLink to={CABINET_LINKS.profile} variant="secondary" size="md">
            {t('campaigns.wizard.submitError.toProfile')}
          </ButtonLink>
        ) : undefined
      }
    >
      {t(KNOWN_CODES.includes(code) ? `campaigns.wizard.submitError.codes.${code}` : 'campaigns.wizard.submitError.text')}
    </Alert>
  );
}
