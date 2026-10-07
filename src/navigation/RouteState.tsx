import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { Alert, Button, LANG_OPTIONS, LogoMark, SegmentedControl, ThemeToggle } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { useAuthSession } from '../auth/useAuthSession';
import { useSignOut } from '../auth/useSignOut';
import { listReturnTo } from './returnTo';
import styles from './RouteState.module.css';

export function RouteFrame({ children, admin = false, wide = false }: { children: ReactNode; admin?: boolean; wide?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const { session } = useAuthSession();
  const { signOut, pending, failed } = useSignOut(admin ? '/admin/login' : undefined);
  useEffect(() => {
    const previous = document.title;
    document.title = admin ? 'ApexAdmin' : 'Apexmedia';
    return () => { document.title = previous; };
  }, [admin]);
  return <div className={styles.frame}>
    <header className={styles.header}>
      <Link className={styles.brand} to={admin ? '/admin' : '/'}><LogoMark /><span>{admin ? 'ApexAdmin' : 'Apexmedia'}</span></Link>
      <div className={styles.controls}>
        <SegmentedControl label={t('common.langLabel')} options={LANG_OPTIONS} value={lang} onChange={setLang} />
        <ThemeToggle labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
        {admin && session ? <Button variant="secondary" size="md" loading={pending} onClick={() => void signOut()}>{t('cabinet.nav.logout')}</Button> : null}
      </div>
    </header>
    <main className={wide ? `${styles.content} ${styles.wide}` : styles.content}>
      {failed ? <Alert tone="danger">{t('cabinet.logoutError')}</Alert> : null}
      {children}
    </main>
  </div>;
}

export function RouteState({ kind = 'notFound', to = '/', label = 'home' }: { kind?: 'notFound' | 'unavailable' | 'denied'; to?: string; label?: 'home' | 'admin' | 'list' }) {
  const { t } = useI18n();
  const location = useLocation();
  return <section className={styles.state} aria-labelledby="route-state-title">
    <h1 id="route-state-title">{t(`navigation.${kind}.title`)}</h1>
    <p>{t(`navigation.${kind}.body`)}</p>
    <div className={styles.actions}><Button href={listReturnTo(location.state, to)} size="md">{t(`navigation.${label}`)}</Button></div>
  </section>;
}

export function AccessDenied() {
  return <RouteFrame admin><RouteState kind="denied" to="/admin" label="admin" /></RouteFrame>;
}
