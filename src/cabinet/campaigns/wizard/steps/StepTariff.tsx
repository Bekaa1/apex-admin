import { ChoiceCard, Icon } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { CABINET_LINKS } from '../../../sections';
import { CORPORATE_TARIFF, RECOMMENDED_TARIFF, TARIFFS, termsOf } from '../../../tariffs';
import { ButtonLink } from '../../../ui/ButtonLink';
import { TariffPoints, TariffPrice, TariffTop } from '../../../ui/TariffParts';
import type { WizardCatalog } from '../types';
import type { CampaignWizardState } from '../useCampaignWizard';

/** «Эксклюзив» next to the plans: not picked here, it leads to a request to the managers. */
function CorporateCard() {
  const { t } = useI18n();
  return (
    <div className="cab-card cab-tariff cmp-corp-card">
      <TariffTop look={CORPORATE_TARIFF} />
      <h3 className="cab-h3">{t('cabinet.tariffs.corporate.name')}</h3>
      <TariffPrice code="corporate" minimum={null} />
      <TariffPoints code="corporate" look={CORPORATE_TARIFF} className="cmp-tariff-points" />
      <ButtonLink to={CABINET_LINKS.corporateFromWizard} variant="secondary" size="md" fullWidth iconRight="arrow-right">
        {t('cabinet.tariffs.offer')}
      </ButtonLink>
    </div>
  );
}

/** Step 2: the plans on sale with their current minimum; «Эксклюзив» leads to a request instead. An edit skips this step. */
export function StepTariff({ wizard, catalog }: { wizard: CampaignWizardState; catalog: WizardCatalog }) {
  const { t } = useI18n();
  const { form, errors, dispatch } = wizard;
  const plans = TARIFFS.flatMap((tariff) => {
    const terms = termsOf(catalog.tariffs, tariff.code);
    return terms ? [{ ...tariff, minimum: terms.minimum }] : [];
  });
  return (
    <div className="cmp-fields">
      <fieldset className="cmp-fieldset">
        <legend className="ax-sr">{t('campaigns.wizard.tariff.legend')}</legend>
        <div className="cmp-tariff-grid">
          {plans.map((tariff) => (
            <ChoiceCard
              key={tariff.code}
              className="cmp-tariff-choice"
              name="tariff"
              value={tariff.code}
              checked={form.tariff === tariff.code}
              onChange={() => dispatch({ type: 'tariff', value: tariff.code })}
              top={<TariffTop look={tariff} recommended={tariff.code === RECOMMENDED_TARIFF} />}
              title={t(`cabinet.tariffs.${tariff.code}.name`)}
            >
              <TariffPrice code={tariff.code} minimum={tariff.minimum} />
              <TariffPoints code={tariff.code} look={tariff} className="cmp-tariff-points" />
            </ChoiceCard>
          ))}
          <CorporateCard />
        </div>
      </fieldset>
      {errors.tariff ? (
        <p className="ax-error" role="alert">
          <Icon name="alert-circle" size={18} />
          <span>{t(errors.tariff === 'unavailable' ? 'campaigns.wizard.tariff.errorUnavailable' : 'campaigns.wizard.tariff.error')}</span>
        </p>
      ) : null}
      <p className="cab-note">
        <Icon name="info" size={18} />
        {t('campaigns.wizard.tariff.note')}
      </p>
    </div>
  );
}
