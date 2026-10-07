import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Button, IconButton, LANG_OPTIONS, Logo, SegmentedControl, ThemeToggle } from '../design-system';
import { useAuthSession } from '../auth/useAuthSession';
import { useI18n } from '../i18n/i18n';
import { ContactDropdown } from './ContactDropdown';
import { CampaignLink } from './CampaignLink';
import styles from './PublicLayout.module.css';

const NAV = [{ path: '/how-it-works', key: 'how' }, { path: '/stores', key: 'stores' }, { path: '/pricing', key: 'pricing' }];

function Preferences() {
  const { t, lang, setLang } = useI18n();
  return <>
    <SegmentedControl label={t('common.langLabel')} options={LANG_OPTIONS} value={lang} onChange={setLang} />
    <ThemeToggle labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
  </>;
}

function Navigation({ close }: { close?: () => void }) {
  const { t } = useI18n();
  return <>{NAV.map(({ path, key }) => <NavLink key={key} to={path} onClick={close} className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>{t(`landing.nav.${key}`)}</NavLink>)}</>;
}

function MobileMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div className={styles.mobileMenu} ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <IconButton icon={open ? 'x' : 'menu'} label={t('public.menu')} aria-expanded={open} aria-controls="public-mobile-menu" onClick={() => setOpen((value) => !value)} />
    <div className={styles.mobilePanel} id="public-mobile-menu" hidden={!open}>
      <nav aria-label={t('landing.nav.label')}><Navigation close={() => setOpen(false)} /><ContactDropdown mobile /></nav>
      <div className={styles.mobilePreferences}><Preferences /></div>
      <CampaignLink fullWidth size="md">{t('landing.nav.start')}</CampaignLink>
    </div>
  </div>;
}

export function PublicLayout() {
  const { t } = useI18n();
  const [year] = useState(() => new Date().getFullYear());
  const { session } = useAuthSession();
  const { pathname } = useLocation();
  useEffect(() => {
    const titleKey = pathname === '/pricing' ? 'pricing' : pathname === '/stores' ? 'stores' : pathname === '/how-it-works' ? 'how' : 'home';
    document.title = `${t(`landing.nav.${titleKey}`)} · Apexmedia`;
  }, [pathname, t]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return <div className={styles.layout}>
    <a className={styles.skip} href="#public-main">{t('public.skip')}</a>
    <header className={styles.header}>
      <Logo size={30} href="/" label={t('landing.nav.home')} />
      <nav className={styles.desktopNav} aria-label={t('landing.nav.label')}><Navigation /><ContactDropdown key={pathname} /></nav>
      <div className={styles.actions}>
        <div className={styles.preferences}><Preferences /></div>
        <Button href={session ? '/cabinet' : '/login'} variant="ghost" size="md" className={styles.login}>{t(session ? 'public.cabinet' : 'landing.nav.login')}</Button>
        <CampaignLink className={styles.start} variant="inverse" size="md">{t('landing.nav.start')}</CampaignLink>
        <MobileMenu key={pathname} />
      </div>
    </header>
    <main id="public-main" className={styles.main} tabIndex={-1}><Outlet /></main>
    <footer className={styles.footer}>
      <p>© {year} Apexmedia</p>
      <div><Link to="/privacy">{t('landing.legal.privacy')}</Link><Link to="/offer">{t('landing.legal.offer')}</Link></div>
    </footer>
  </div>;
}
