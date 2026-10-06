import { useEffect, useRef, useState } from 'react';
import { Button, IconButton, LANG_OPTIONS, Logo, SegmentedControl, ThemeToggle } from '../design-system';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !mobileMenuRef.current?.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        mobileMenuRef.current?.querySelector('button')?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

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
          <div className="land__preferences">
            <SegmentedControl className="land__lang" label={t('common.langLabel')} options={LANG_OPTIONS} value={lang} onChange={setLang} />
            <ThemeToggle className="land__theme" labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
          </div>
          <Button className="land__login" variant="ghost" size="md" href={loginHref}>
            {t('landing.nav.login')}
          </Button>
          <Button className="land__start" variant="inverse" size="md" href={startHref}>
            {t('landing.nav.start')}
          </Button>
          <div className="land__mobile-menu" ref={mobileMenuRef}>
            <IconButton
              className="land__mobile-menu-toggle"
              icon={mobileMenuOpen ? 'x' : 'menu'}
              label={t('landing.nav.menu')}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-preferences"
              onClick={() => setMobileMenuOpen((open) => !open)}
            />
            <div
              className="land__mobile-menu-panel"
              id="landing-mobile-preferences"
              role="group"
              aria-label={t('landing.nav.menu')}
              hidden={!mobileMenuOpen}
            >
              <SegmentedControl
                label={t('common.langLabel')}
                options={LANG_OPTIONS}
                value={lang}
                onChange={setLang}
              />
              <ThemeToggle labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
            </div>
          </div>
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
      </main>

      <footer className="land__footer" aria-label={t('landing.legal.label')}>
        <a className="land__legal-link" href="/privacy">
          {t('landing.legal.privacy')}
        </a>
        <a className="land__legal-link" href="/offer">
          {t('landing.legal.offer')}
        </a>
      </footer>
    </div>
  );
}
