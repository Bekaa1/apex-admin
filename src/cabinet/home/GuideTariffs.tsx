import { Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney } from '../../lib/format';

const FEATURES = ['allCarts', 'zonePriority', 'moreShows', 'brandOnly'] as const;
const LEVELS = [1, 2, 3, 4];

// Plans as drawn in the design; the backend `tariffs` table does not match them yet.
const TARIFFS = [
  { key: 'standard', level: 1, minimum: 500_000 },
  { key: 'zones', level: 2, minimum: 1_000_000 },
  { key: 'premium', level: 3, minimum: 2_000_000 },
  { key: 'exclusive', level: 4, minimum: 5_000_000 },
];

export function GuideTariffs() {
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
        {TARIFFS.map((tariff) => (
          <li key={tariff.key} className="cab-card cab-tariff">
            <span className="cab-tariff__level" aria-hidden="true">
              {LEVELS.map((level) => (
                <span key={level} className={level <= tariff.level ? 'is-on' : undefined} />
              ))}
            </span>
            <h3 className="cab-h3">{t(`home.tariffs.${tariff.key}.name`)}</h3>
            <p className="cab-tariff__text">{t(`home.tariffs.${tariff.key}.text`)}</p>
            <ul className="cab-tariff__features">
              {FEATURES.map((feature, i) => {
                const included = i < tariff.level;
                return (
                  <li key={feature} className={included ? 'is-on' : 'is-off'}>
                    <Icon name={included ? 'check' : 'minus'} size={18} />
                    <span>
                      <span className="cab-sr">{t(included ? 'home.tariffs.has' : 'home.tariffs.hasNot')} </span>
                      {t(`home.tariffs.feature.${feature}`)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="cab-tariff__min">
              <span>{t('home.tariffs.minimum')}</span>
              <strong>{t('home.tariffs.from', { amount: formatMoney(tariff.minimum, lang) })}</strong>
            </div>
          </li>
        ))}
      </ul>
      <p className="cab-note">
        <Icon name="info" size={18} />
        {t('home.tariffs.note')}
      </p>
    </section>
  );
}
