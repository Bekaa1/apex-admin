import { Badge, ChoiceCard, Icon } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatMoney, formatPrice } from '../../../../lib/format';
import { CABINET_LINKS } from '../../../sections';
import { CORPORATE_LEVEL, TARIFF_FEATURES, TARIFF_LEVELS, TARIFFS, termsOf } from '../../../tariffs';
import { ButtonLink } from '../../../ui/ButtonLink';
import type { WizardCatalog } from '../types';
import type { CampaignWizardState } from '../useCampaignWizard';

const CORPORATE_FEATURES = ['reach', 'zonePriority', 'moreShows', 'brandOnly', 'manager'];

function Level({ level, accent }: { level: number; accent?: boolean }) {
  return (
    <span className={accent ? 'cab-tariff__level cmp-level--accent' : 'cab-tariff__level'}>
      {TARIFF_LEVELS.map((bar) => (
        <span key={bar} className={bar <= level ? 'is-on' : undefined} />
      ))}
    </span>
  );
}

function CorporateCard() {
  const { t } = useI18n();
  return (
    <div className="cab-card cab-tariff cmp-corp-card">
      <div className="cmp-corp-card__top" aria-hidden="true">
        <Level level={CORPORATE_LEVEL} accent />
        <Badge tone="accent">{t('campaigns.wizard.tariff.corporate.badge')}</Badge>
      </div>
      <h3 className="cab-h3">{t('cabinet.tariffs.corporate.name')}</h3>
      <p className="cab-tariff__text">{t('cabinet.tariffs.corporate.text')}</p>
      <ul className="cab-tariff__features">
        {CORPORATE_FEATURES.map((feature) => (
          <li key={feature} className="is-on">
            <Icon name="check" size={18} />
            <span>{t(`campaigns.wizard.tariff.corporate.features.${feature}`)}</span>
          </li>
        ))}
      </ul>
      <div className="cab-tariff__min">
        <span>{t('cabinet.tariffs.budget')}</span>
        <strong className="cmp-corp-card__price">{t('cabinet.tariffs.byAgreement')}</strong>
      </div>
      <ButtonLink to={CABINET_LINKS.corporateFromWizard} variant="secondary" size="md" fullWidth iconRight="arrow-right">
        {t('campaigns.wizard.tariff.corporate.discuss')}
      </ButtonLink>
    </div>
  );
}

/** Step 2: the plans on sale with their current minimum; the corporate plan leads to a request instead. An edit skips this step. */
export function StepTariff({ wizard, catalog }: { wizard: CampaignWizardState; catalog: WizardCatalog }) {
  const { t, lang } = useI18n();
  const { form, errors, dispatch } = wizard;
  const plans = TARIFFS.flatMap((tariff) => {
    const terms = termsOf(catalog.tariffs, tariff.code);
    return terms ? [{ ...tariff, minimum: terms.minimum, pricePerPlay: terms.pricePerPlay }] : [];
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
              top={<Level level={tariff.level} />}
              title={t(`cabinet.tariffs.${tariff.code}.name`)}
            >
              <p className="cab-tariff__text">{t(`cabinet.tariffs.${tariff.code}.text`)}</p>
              <ul className="cab-tariff__features">
                {TARIFF_FEATURES.map((feature, i) => {
                  const included = i < tariff.level;
                  return (
                    <li key={feature} className={included ? 'is-on' : 'is-off'}>
                      <Icon name={included ? 'check' : 'minus'} size={18} />
                      <span>
                        <span className="cab-sr">{t(included ? 'cabinet.tariffs.has' : 'cabinet.tariffs.hasNot')} </span>
                        {t(`cabinet.tariffs.feature.${feature}`)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="cab-tariff__min">
                <p className="cab-tariff__price">
                  <span>{t('cabinet.tariffs.pricePerPlay')}</span>
                  <strong>{formatPrice(tariff.pricePerPlay, lang)}</strong>
                </p>
                <span>{t('cabinet.tariffs.minimum')}</span>
                <strong>{t('cabinet.tariffs.from', { amount: formatMoney(tariff.minimum, lang) })}</strong>
              </div>
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
