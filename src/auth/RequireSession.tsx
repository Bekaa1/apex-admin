import { Navigate, Outlet } from 'react-router';
import { Alert, Button, Skeleton } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthLayout } from './AuthLayout';
import { useAuthSession } from './useAuthSession';
import { DEFAULT_AUTH_LINKS } from './links';

export function SessionLoading() {
  const { t } = useI18n();
  return (
      <AuthLayout showLegalLinks={false}>
        <div className="auth__form" role="status" aria-busy="true">
          <p>{t('cabinet.sessionLoading')}</p>
          <Skeleton variant="block" height="var(--control-lg)" />
        </div>
      </AuthLayout>
  );
}

export function RequireSession() {
  const { status, session } = useAuthSession();
  const { t } = useI18n();

  if (status === 'loading') return <SessionLoading />;
  if (status === 'error') {
    return (
      <AuthLayout showLegalLinks={false}>
        <div className="auth__form">
          <Alert tone="danger" title={t('cabinet.sessionErrorTitle')}>{t('login.errors.unavailableBody')}</Alert>
          <Button onClick={() => window.location.reload()}>{t('home.summary.retry')}</Button>
        </div>
      </AuthLayout>
    );
  }
  return session ? <Outlet /> : <Navigate to={DEFAULT_AUTH_LINKS.login} replace />;
}
