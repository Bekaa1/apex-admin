import { Outlet, ScrollRestoration } from 'react-router';
import { useSignOut } from '../auth/useSignOut';
import { Alert, Icon } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AdminShell } from './AdminShell';

/** Mounted only in RequireAdmin's successful Outlet. */
export function AdminLayout() {
  const { t } = useI18n();
  const { signOut, pending, failed } = useSignOut('/admin/login');
  return <AdminShell accountAction={<button type="button" className="cab-nav__item cab-nav__item--button" onClick={() => void signOut()} disabled={pending} aria-busy={pending}>
    <Icon name="log-out" /><span className="cab-nav__label">{t('cabinet.nav.logout')}</span>
  </button>}>
    {failed ? <Alert tone="danger">{t('cabinet.logoutError')}</Alert> : null}
    <Outlet />
    <ScrollRestoration getKey={(location) => location.pathname + location.search} />
  </AdminShell>;
}
