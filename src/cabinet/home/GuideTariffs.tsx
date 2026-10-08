import type { ReactNode } from 'react';
import { Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney, formatPrice } from '../../lib/format';
import { CORPORATE_LEVEL, TARIFFS, TARIFF_FEATURES, TARIFF_LEVELS, termsOf, type TariffTerms } from '../tariffs';

interface TariffCardProps {
  code: string;
  level: number;
  /** null for the corporate plan: its price is agreed with a manager. */
  price: ReactNode | null;
  minLabel: string;
  min: ReactNode;
}

function TariffCard({ code, level, price, minLabel, min }: TariffCardProps) {
  const { t } = useI18n();
  return (
    <li className="cab-card cab-tariff">
      <span className="cab-tariff__level" aria-hidden="true">
        {TARIFF_LEVELS.map((bar) => (
          <span key={bar} className={bar <= level ? 'is-on' : undefined} />
        ))}
      </span>
      <h3 className="cab-h3">{t(`cabinet.tariffs.${code}.name`)}</h3>
      <p className="cab-tariff__text">{t(`cabinet.tariffs.${code}.text`)}</p>
      <ul className="cab-tariff__features">
        {TARIFF_FEATURES.map((feature, i) => {
          const included = i < level;
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
        {price === null ? null : (
          <p className="cab-tariff__price">
            <span>{t('cabinet.tariffs.pricePerPlay')}</span>
            <strong>{price}</strong>
          </p>
        )}
        <span>{minLabel}</span>
        <strong>{min}</strong>
      </div>
    </li>
  );
}

/** `terms` is null while the plans' terms load; plans off sale are not shown. */
export function GuideTariffs({ terms }: { terms: TariffTerms[] | null }) {
  const { t, lang } = useI18n();
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
            <TariffCard
              key={tariff.code}
              code={tariff.code}
              level={tariff.level}
              price={plan ? formatPrice(plan.pricePerPlay, lang) : '—'}
              minLabel={t('cabinet.tariffs.minimum')}
              min={plan ? t('cabinet.tariffs.from', { amount: formatMoney(plan.minimum, lang) }) : '—'}
            />
          );
        })}
        <TariffCard code="corporate" level={CORPORATE_LEVEL} price={null} minLabel={t('cabinet.tariffs.budget')} min={t('cabinet.tariffs.byAgreement')} />
      </ul>
      <p className="cab-note">
        <Icon name="info" size={18} />
        {t('home.tariffs.note')}
      </p>
    </section>
  );
}
