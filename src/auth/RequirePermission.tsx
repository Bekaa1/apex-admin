import { Navigate, Outlet, useMatches } from 'react-router';
import { Alert, Button } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { isPermission, panelHome } from './permissions';
import { usePermissions } from './usePermissions';

export function PermissionDenied() {
  const { t } = useI18n();
  return <Alert tone="warning" title={t('roles.denied')} action={<Button href="/admin" size="md" variant="secondary">{t('roles.home')}</Button>}>
    {t('roles.deniedBody')}
  </Alert>;
}
/** Every direct address passes this gate before the lazy page and its queries mount. */
export function RequireAdminSection() {
  const handles = useMatches().map(match => match.handle).filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'));
  const { can, roles } = usePermissions();
  if (handles.some(handle => handle.adminHome === true)) {
    const home = panelHome(roles);
    return home === '/admin' ? <Outlet /> : <Navigate to={home} replace />;
  }
  const permission = handles.findLast(handle => isPermission(handle.adminPermission))?.adminPermission;
  // Matched route metadata also covers mixed-case and percent-encoded URLs.
  // Only an explicitly designated administrative 404 is permission-neutral.
  return isPermission(permission) && can(permission) || handles.some(handle => handle.admin404 === true) ? <Outlet /> : <PermissionDenied />;
}
