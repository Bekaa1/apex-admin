import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Icon, IconButton, LANG_OPTIONS, LogoMark, SegmentedControl, ThemeToggle } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AdminNavigation } from './AdminNavigation';
import { ADMIN_SECTIONS, adminSectionFor } from './sections';
import '../cabinet/cabinet.css';
import styles from './AdminLayout.module.css';

/** Presentational shell: no Auth, Supabase, queries, or account/profile fetches. */
export function AdminShell({ children, accountAction, preview = false }: { children: ReactNode; accountAction?: ReactNode; preview?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const titleId = useId();
  const section = adminSectionFor(pathname);
  const primaryTabs = ADMIN_SECTIONS.slice(0, 3);
  const moreActive = Boolean(section && !primaryTabs.includes(section));
  useEffect(() => {
    const previous = document.title;
    document.title = 'ApexAdmin';
    return () => { document.title = previous; };
  }, []);
  useEffect(() => { dialog.current?.close(); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 761px)');
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => { document.body.style.overflow = previous; desktop.removeEventListener('change', closeOnDesktop); };
  }, [open]);
  const close = () => dialog.current?.close();
  return <div className={`cab ${styles.shell}`}>
    <a className={styles.skip} href="#admin-main" onClick={(event) => { event.preventDefault(); document.getElementById('admin-main')?.focus(); }}>{t('adminShell.skip')}</a>
    <aside className="cab__side"><div className="cab__side-inner">
      <Link className="ax-logo cab__logo" to="/admin" aria-label="ApexAdmin"><LogoMark size={28} /><span className="ax-logo__word">ApexAdmin</span></Link>
      <AdminNavigation />
      {accountAction ? <div className="cab__side-bottom">{accountAction}</div> : null}
    </div></aside>
    <div className="cab__body">
      <header className={`cab__top ${styles.top}`}>
        <p className={`cab__title ${styles.sectionTitle}`}>{section ? t(section.labelKey) : t('adminShell.notFound.title')}</p>
        <Link className={`ax-logo ${styles.mobileBrand}`} to="/admin" aria-label="ApexAdmin"><LogoMark size={24} /><span>ApexAdmin</span></Link>
        <div className="cab__top-actions">
          <SegmentedControl className="cab__lang" label={t('common.langLabel')} options={LANG_OPTIONS} value={lang} onChange={setLang} />
          <ThemeToggle labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
        </div>
      </header>
      <main className="cab__main" id="admin-main" tabIndex={-1}><div className="cab__content">
        {preview ? <p className={styles.preview}>{t('adminShell.preview')}</p> : null}
        {children}
      </div></main>
    </div>
    <nav className="cab-tabs" aria-label={t('adminShell.mobileMenu')}>
      {primaryTabs.map((item) => <NavLink className="cab-tabs__item" key={item.path} to={item.path} end={item.path === '/admin'}>
        <span className="cab-tabs__icon"><Icon name={item.icon} size={22} /></span><span className="cab-tabs__label">{t(item.labelKey)}</span>
      </NavLink>)}
      <button className={`cab-tabs__item ${styles.more}`} type="button" aria-expanded={open} aria-controls={dialogId} aria-haspopup="dialog" data-active={moreActive || undefined}
        onClick={(event) => { trigger.current = event.currentTarget; dialog.current?.showModal(); setOpen(true); }}>
        <span className="cab-tabs__icon"><Icon name="menu" size={22} /></span><span className="cab-tabs__label">{t('adminShell.more')}</span>
      </button>
    </nav>
    <dialog ref={dialog} id={dialogId} aria-labelledby={titleId} className={styles.drawer}
      onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }}>
      <div className={styles.drawerHeader}><h2 id={titleId}>{t('adminShell.menu')}</h2><IconButton icon="x" label={t('adminShell.closeMenu')} onClick={close} /></div>
      <AdminNavigation onNavigate={close} />
      {accountAction ? <div className={styles.drawerAction}>{accountAction}</div> : null}
    </dialog>
  </div>;
}
