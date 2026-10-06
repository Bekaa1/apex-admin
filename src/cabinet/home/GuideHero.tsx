import { Badge, Button, Icon, type IconName } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney } from '../../lib/format';
import { CABINET_LINKS } from '../sections';
import { ButtonLink } from '../ui/ButtonLink';

const FACTS: Array<{ key: string; icon: IconName }> = [
  { key: 'payment', icon: 'credit-card' },
  { key: 'review', icon: 'shield-check' },
  { key: 'stats', icon: 'chart' },
];

const EXAMPLE_BUDGET = 1_000_000;

export function GuideHero() {
  const { t, lang } = useI18n();
  return (
    <section className="cab-card cab-hero" aria-labelledby="hero-title">
      <div className="cab-hero__copy">
        <Badge tone="brand" className="cab-hero__badge">
          {t('home.guide.badge')}
        </Badge>
        <h2 className="cab-hero__title" id="hero-title">
          {t('home.guide.title')}
        </h2>
        <p className="cab-hero__text">{t('home.guide.text')}</p>
        <div className="cab-hero__ctas">
          <ButtonLink to={CABINET_LINKS.newCampaign} variant="primary" size="xl" iconLeft="plus">
            {t('cabinet.createCampaign')}
          </ButtonLink>
          <Button href="#how" variant="secondary" size="xl">
            {t('home.guide.how')}
          </Button>
        </div>
        <ul className="cab-hero__facts">
          {FACTS.map((fact) => (
            <li key={fact.key}>
              <Icon name={fact.icon} />
              {t(`home.guide.facts.${fact.key}`)}
            </li>
          ))}
        </ul>
      </div>
      <figure className="cab-hero__visual">
        <figcaption className="cab-overline">{t('home.guide.example.caption')}</figcaption>
        <div className="cab-device" aria-hidden="true">
          <div className="cab-device__tablet">
            <div className="cab-device__screen">
              <span className="cab-device__badge">{t('home.guide.example.adBadge')}</span>
              <span className="cab-device__play">
                <Icon name="play" size={18} />
              </span>
              <span className="cab-device__bottom">
                <span className="cab-device__title">{t('home.guide.example.adTitle')}</span>
                <span className="cab-device__progress">
                  <span />
                </span>
              </span>
            </div>
          </div>
          <div className="cab-device__mount" />
          <div className="cab-device__handle" />
        </div>
        <dl className="cab-receipt">
          <div>
            <dt>{t('home.guide.example.tariff')}</dt>
            <dd>{t('home.tariffs.zones.name')}</dd>
          </div>
          <div>
            <dt>{t('home.guide.example.stores')}</dt>
            <dd>{t('home.guide.example.storesValue')}</dd>
          </div>
          <div>
            <dt>{t('home.guide.example.zones')}</dt>
            <dd>{t('home.guide.example.zonesValue')}</dd>
          </div>
          <div>
            <dt>{t('home.guide.example.budget')}</dt>
            <dd>{formatMoney(EXAMPLE_BUDGET, lang)}</dd>
          </div>
        </dl>
      </figure>
    </section>
  );
}
