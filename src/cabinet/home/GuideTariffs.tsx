import { Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { campaignIntentHref } from '../../lib/campaignIntent';
import { CABINET_LINKS } from '../sections';
import { CORPORATE_TARIFF, RECOMMENDED_TARIFF, TARIFFS, termsOf, type TariffCode, type TariffLook, type TariffTerms } from '../tariffs';
import { ButtonLink } from '../ui/ButtonLink';
import { TariffPoints, TariffPrice, TariffTop } from '../ui/TariffParts';

interface TariffCardProps {
  code: TariffCode | 'corporate';
  look: TariffLook;
  /** null while the terms load, and for «Эксклюзив», whose budget is agreed with a manager. */
  minimum: number | null;
}

function TariffCard({ code, look, minimum }: TariffCardProps) {
  const { t } = useI18n();
  const recommended = code === RECOMMENDED_TARIFF;
  const name = t(`cabinet.tariffs.${code}.name`);
  return (
    <li className={recommended ? 'cab-card cab-tariff is-recommended' : 'cab-card cab-tariff'}>
      <TariffTop look={look} recommended={recommended} />
      <h3 className="cab-h3">{name}</h3>
      <TariffPrice code={code} minimum={minimum} />
      <TariffPoints code={code} look={look} className="cab-tariff__points" />
      {code === 'corporate' ? (
        <ButtonLink to={CABINET_LINKS.corporate} variant="secondary" fullWidth iconRight="arrow-right">
          {t('cabinet.tariffs.offer')}
        </ButtonLink>
      ) : (
        <ButtonLink to={campaignIntentHref({ tariff: code })} variant={recommended ? 'primary' : 'secondary'} fullWidth aria-label={`${t('cabinet.tariffs.choose')}: ${name}`}>
          {t('cabinet.tariffs.choose')}
        </ButtonLink>
      )}
    </li>
  );
}

/** `terms` is null while the plans' terms load; plans off sale are not shown. */
export function GuideTariffs({ terms }: { terms: TariffTerms[] | null }) {
  const { t } = useI18n();
  return (
    <section className="cab-section" aria-labelledby="tariffs-title" id="tariffs">
      <div className="cab-head">
        <div className="cab-head__copy">
          <h2 className="cab-h2" id="tariffs-title">
            {t('home.tariffs.title')}
          </h2>
          <p className="cab-lead">{t('home.tariffs.lead')}</p>
        </div>
      </div>
      {/* Scrolls sideways on phones, so it must be reachable from the keyboard. */}
      <ul className="cab-tariffs" tabIndex={0} aria-labelledby="tariffs-title">
        {TARIFFS.map((tariff) => {
          const plan = terms ? termsOf(terms, tariff.code) : null;
          if (terms && !plan) return null;
          return (
            <TariffCard key={tariff.code} code={tariff.code} look={tariff} minimum={plan?.minimum ?? null} />
          );
        })}
        <TariffCard code="corporate" look={CORPORATE_TARIFF} minimum={null} />
      </ul>
      <p className="cab-note">
        <Icon name="info" size={18} />
        {t('home.tariffs.note')}
      </p>
    </section>
  );
}
