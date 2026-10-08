import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router';
import { Alert, Button, Skeleton } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { requireSupabase, supabase } from '../lib/supabase';
import { RouteFrame } from '../navigation/RouteState';
import { useAuthSession } from './useAuthSession';
import { adminAccessState } from './adminAccess';
import { can, parseRoles, permissionKey } from './permissions';
import { PermissionsContext } from './usePermissions';

/** Children mount only after my_roles grants panel access for the current session. */
export function RequireAdmin() {
  const { status, session } = useAuthSession();
  const { t } = useI18n();
  const client = useQueryClient();
  const check = useQuery({
    queryKey: permissionKey(session),
    enabled: Boolean(supabase) && status === 'ready' && Boolean(session),
    queryFn: async ({ signal }) => {
      // A network assignment can change without changing the role names. Discard
      // scoped data on every permission check, including failed checks.
      await client.cancelQueries({ queryKey: ['admin'] });
      client.removeQueries({ predicate: query => query.queryKey[0] === 'admin' && !['invoice-payment', 'role-operation'].includes(String(query.queryKey[1])) });
      // Keep operation locks until logout: a role refetch must not enable a
      // second financial attempt whose previous result is still unknown.
      const { data, error } = await requireSupabase().rpc('my_roles').abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15_000)]));
      if (error) throw error;
      return parseRoles(data);
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const access = adminAccessState({ configured: Boolean(supabase), sessionStatus: status, hasSession: Boolean(session), roleError: check.isError, rolePending: check.isPending, roleFetching: check.isFetching, role: can(check.data ?? [], 'panel') });
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
  return <PermissionsContext.Provider value={check.data ?? []}><Outlet /></PermissionsContext.Provider>;
}
