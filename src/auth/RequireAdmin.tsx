import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router';
import { Alert, Button, Skeleton } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { requireSupabase, supabase } from '../lib/supabase';
import { RouteFrame } from '../navigation/RouteState';
import { useAuthSession } from './useAuthSession';
import { adminAccessState } from './adminAccess';

/** No administrative child mounts until the current session receives literal true. */
export function RequireAdmin() {
  const { status, session } = useAuthSession();
  const { t } = useI18n();
  const check = useQuery({
    queryKey: ['admin-access', session?.user.id, session?.expires_at],
    enabled: Boolean(supabase) && status === 'ready' && Boolean(session),
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase().rpc('is_apex_admin').abortSignal(signal);
      if (error) throw error;
      return data === true;
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const access = adminAccessState({ configured: Boolean(supabase), sessionStatus: status, hasSession: Boolean(session), roleError: check.isError, rolePending: check.isPending, roleFetching: check.isFetching, role: check.data });
  if (access === 'unconfigured') return <RouteFrame admin><Alert title={t('adminAuth.notConfigured')} /></RouteFrame>;
  if (access === 'signedOut') return <Navigate to="/login" replace />;
  if (access === 'error') return <RouteFrame admin>
    <Alert tone="danger" title={t('navigation.accessError.title')}>{t('navigation.accessError.body')}</Alert>
    <Button size="md" disabled={check.isFetching} onClick={() => status === 'error' ? window.location.reload() : void check.refetch()}>{t('cabinet.retry')}</Button>
  </RouteFrame>;
  if (access === 'loading') return <RouteFrame admin>
    <div role="status" aria-busy="true"><p>{t('navigation.checking')}</p><Skeleton variant="block" height="var(--control-lg)" /></div>
  </RouteFrame>;
  if (access === 'denied') return <Navigate to="/access-denied" replace />;
  return <Outlet />;
}
