import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatPrice } from '../../../lib/format';
import { TermsChanged, type TermsDiff } from '../TermsChanged';
import type { CampaignWizardState } from './useCampaignWizard';

/** The server refused the campaign because the plan's terms changed: what was shown, what is now, and the consent. */
export function WizardTermsChanged({ wizard }: { wizard: CampaignWizardState }) {
  const { t, lang } = useI18n();
  const change = wizard.termsChange;
  if (!change) return null;
  const { was, now } = change;
  const diffs: TermsDiff[] = [];
  if (was.pricePerPlay !== now.pricePerPlay) {
    diffs.push({ key: 'price', label: t('campaigns.terms.price'), was: formatPrice(was.pricePerPlay, lang), now: formatPrice(now.pricePerPlay, lang) });
  }
  if (was.minimum !== now.minimum) {
    diffs.push({ key: 'minimum', label: t('campaigns.terms.minimum'), was: formatMoney(was.minimum, lang), now: formatMoney(now.minimum, lang) });
  }
  return (
    <TermsChanged
      text={t('campaigns.terms.text', { tariff: t(`cabinet.tariffs.${now.code}.name`) })}
      diffs={diffs}
      note={t('campaigns.terms.noteNew')}
      agreed={wizard.termsAgreed}
      invalid={wizard.termsError}
      onAgree={wizard.agreeToTerms}
    />
  );
}
