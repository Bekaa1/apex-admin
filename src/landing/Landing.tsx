import { Button } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { CampaignLink } from './CampaignLink';

export function Landing() {
  const { t } = useI18n();
  return (
    <div className="land__hero">
      <section className="land__copy">
        <p className="land__eyebrow"><span className="land__dot" aria-hidden="true" />{t('landing.hero.eyebrow')}</p>
        <h1 className="land__title">{t('landing.hero.titleBefore')}<span className="land__accent">{t('landing.hero.titleAccent')}</span>{t('landing.hero.titleAfter')}</h1>
        <p className="land__text">{t('landing.hero.text')}</p>
        <div className="land__ctas">
          <CampaignLink size="xl" iconRight="arrow-right">{t('landing.hero.ctaPrimary')}</CampaignLink>
          <Button size="xl" variant="secondary" href="/how-it-works">{t('landing.hero.ctaSecondary')}</Button>
        </div>
        <div className="land__stats">
          {[1, 2, 3].map((n) => <div className="land__stat" key={n}><p className="land__stat-value">{t('landing.stats.s' + n + 'Value')}</p><p className="land__stat-label">{t('landing.stats.s' + n + 'Label')}</p></div>)}
        </div>
      </section>
    </div>
  );
}
