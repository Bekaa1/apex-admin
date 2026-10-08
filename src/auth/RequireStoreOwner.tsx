import { Navigate, Outlet } from 'react-router';
import { Alert, Button, Skeleton } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { failure } from '../admin/stores/onboarding/errors';
import { useStoreOwnerAccess } from './useStoreOwnerAccess';

/** Nested under RequireAdmin. Neither queue nor request mounts before literal true. */
export function RequireStoreOwner() {
  const { access, query } = useStoreOwnerAccess(), { t } = useI18n();
  if (access === 'signedOut') return <Navigate to="/login" replace />;
  if (access === 'loading') return <div role="status" aria-busy="true"><p>{t('adminStoreOwner.checking')}</p><Skeleton variant="block" height="80px" /></div>;
  if (access === 'unconfigured') return <Alert title={t('adminAuth.notConfigured')} />;
  if (access !== 'allowed') return <Alert tone="danger" title={t(access === 'denied' ? 'adminStoreOwner.errors.forbidden'
    : failure(query.error).kind === 'owner_not_configured' ? 'adminStoreOwner.errors.owner_not_configured' : 'adminStoreOwner.accessError')}
    action={<Button size="md" onClick={() => void query.refetch()}>{t('adminStoreRequests.retry')}</Button>} />;
  return <Outlet context={{ owner: true }} />;
}
