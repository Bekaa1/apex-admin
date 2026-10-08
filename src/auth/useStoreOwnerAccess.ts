import { useQuery } from '@tanstack/react-query';
import { requireSupabase, supabase } from '../lib/supabase';
import { adminAccessState } from './adminAccess';
import { useAuthSession } from './useAuthSession';

/** A separate capability, never inferred from users.role. Shared by entry and guard. */
export function useStoreOwnerAccess() {
  const { status, session } = useAuthSession();
  const query = useQuery({
    queryKey: ['admin', 'store-owner-access', session?.user.id, session?.expires_at],
    enabled: Boolean(supabase) && status === 'ready' && Boolean(session),
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase().rpc('is_apex_store_owner')
        .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(15_000)]));
      if (error) throw error;
      return data === true;
    },
    retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true,
  });
  const access = adminAccessState({ configured: Boolean(supabase), sessionStatus: status, hasSession: Boolean(session),
    roleError: query.isError, rolePending: query.isPending, roleFetching: query.isFetching, role: query.data });
  return { access, query };
}
