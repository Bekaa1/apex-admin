import { Button, Icon, LANG_OPTIONS, Logo, SegmentedControl, ThemeToggle } from '../design-system';
import { useI18n } from '../i18n/i18n';

export interface LandingProps {
  /** «Войти» → sign-in screen. */
  loginHref: string;
  /** «Начать» / «Запустить рекламу» → sign-up screen. */
  startHref: string;
}

/**
 * Landing — direction A («Ясный сигнал»): header + hero. Light and dark («Графит») come from tokens.
 * Sections linked from the nav (#how, #stores, #pricing, #contacts) are not designed yet.
 */
export function Landing({ loginHref, startHref }: LandingProps) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="land" id="top">
      <header className="land__header">
        <Logo className="land__logo" size={30} href="#top" label={t('landing.nav.home')} />
        <nav className="land__nav" aria-label={t('landing.nav.label')}>
          <a href="#how">{t('landing.nav.how')}</a>
          <a href="#stores">{t('landing.nav.stores')}</a>
          <a href="#pricing">{t('landing.nav.pricing')}</a>
          <a href="#contacts">{t('landing.nav.contacts')}</a>
        </nav>
        <div className="land__actions">
          <SegmentedControl className="land__lang" label={t('common.langLabel')} options={LANG_OPTIONS} value={lang} onChange={setLang} />
          <ThemeToggle className="land__theme" labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
          <Button className="land__login" variant="ghost" size="md" href={loginHref}>
            {t('landing.nav.login')}
          </Button>
          <Button className="land__start" variant="inverse" size="md" href={startHref}>
            {t('landing.nav.start')}
          </Button>
        </div>
      </header>

      <main className="land__hero">
        <section className="land__copy">
          <p className="land__eyebrow">
            <span className="land__dot" aria-hidden="true" />
            {t('landing.hero.eyebrow')}
          </p>
          <h1 className="land__title">
            {t('landing.hero.titleBefore')}
            <span className="land__accent">{t('landing.hero.titleAccent')}</span>
            {t('landing.hero.titleAfter')}
          </h1>
          <p className="land__text">{t('landing.hero.text')}</p>
          <div className="land__ctas">
            <Button size="xl" iconRight="arrow-right" href={startHref}>
              {t('landing.hero.ctaPrimary')}
            </Button>
            <Button size="xl" variant="secondary" href="#how">
              {t('landing.hero.ctaSecondary')}
            </Button>
          </div>
          <div className="land__stats">
            {[1, 2, 3].map((n) => (
              <div className="land__stat" key={n}>
                <p className="land__stat-value">{t(`landing.stats.s${n}Value`)}</p>
                <p className="land__stat-label">{t(`landing.stats.s${n}Label`)}</p>
              </div>
            ))}
          </div>
        </section>
        <HeroFigure />
      </main>
    </div>
  );
}

/** Illustration: a tablet on a cart handle playing the ad, with two floating status chips. */
function HeroFigure() {
  const { t } = useI18n();
  return (
    <figure className="land__figure" aria-label={t('landing.figure.alt')}>
      <svg className="land__facets" viewBox="0 0 600 552" preserveAspectRatio="none" aria-hidden="true">
        <path d="M300 36 L572 520 M300 36 L28 520 M110 430 L478 300" />
      </svg>
      <div className="land__device" aria-hidden="true">
        <div className="land__tablet">
          <div className="land__screen">
            <span className="land__ad-badge">{t('landing.figure.adBadge')}</span>
            <span className="land__play">
              <Icon name="play" size={22} />
            </span>
            <div className="land__ad-bottom">
              <span className="land__ad-title">{t('landing.figure.adTitle')}</span>
              <span className="land__progress">
                <span />
              </span>
            </div>
          </div>
        </div>
        <div className="land__mount" />
        <div className="land__handle">
          <span />
        </div>
      </div>
      <div className="land__chip land__chip--top">
        <span className="land__chip-icon">
          <Icon name="shelf" size={22} />
        </span>
        <span>
          <span className="land__chip-title">{t('landing.figure.chip1Title')}</span>
          <span className="land__chip-text">{t('landing.figure.chip1Text')}</span>
        </span>
      </div>
      <div className="land__chip land__chip--bottom">
        <span className="land__chip-icon">
          <Icon name="check-circle" size={22} />
        </span>
        <span>
          <span className="land__chip-title">{t('landing.figure.chip2Title')}</span>
          <span className="land__chip-text">{t('landing.figure.chip2Text')}</span>
        </span>
      </div>
    </figure>
  );
}
