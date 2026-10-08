import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { fetchCampaignDetail } from '../details/api';
import type { CampaignDetail } from '../details/model';
import { moderateCampaign } from './api';
import { createDecisionController, INITIAL_DECISION } from './controller';
import { ModerationError } from './model';

/** Mounted inside RequireAdmin; reuses its cached result, never a second role check. */
export function useModeration(id: string) {
  const { session } = useAuthSession();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: moderateCampaign, retry: false, networkMode: 'always', gcTime: 0 });
  const [state, setState] = useState(INITIAL_DECISION);
  const [controller] = useState(() => {
    const roleKey = ['admin-access', session?.user.id, session?.expires_at];
    const detailKey = ['admin', 'campaign-detail', session?.user.id, id];
    const recordKey = [...detailKey, 'record'];
    const shared = [['admin', 'campaigns'], ['admin', 'overview'], ['admin', 'audit']];
    const authorize = () => {
      if (!session || !session.expires_at || session.expires_at * 1000 <= Date.now()) return 'not_authenticated';
      const role = client.getQueryState(roleKey);
      return role?.data === true && role.status === 'success' && role.fetchStatus === 'idle' ? null : 'forbidden';
    };
    return createDecisionController({
      authorize,
      pending: () => {
        const query = client.getQueryState<CampaignDetail | null>(recordKey);
        return query?.status === 'success' && query.fetchStatus === 'idle' && query.data?.status === 'pending';
      },
      send: decision => mutation.mutateAsync(decision),
      changed: setState,
      denied: () => {
        client.setQueryData(roleKey, false);
        client.removeQueries({ queryKey: ['admin'] });
      },
      refresh: async () => {
        await client.cancelQueries({ queryKey: detailKey });
        await Promise.all([...shared, detailKey].map(queryKey => client.invalidateQueries({ queryKey, refetchType: 'none' })));
        // Logout may have cleared the cache during the awaits above.
        const issue = authorize();
        if (issue) throw new ModerationError(issue);
        const record = client.fetchQuery({ queryKey: recordKey, queryFn: ({ signal }) => fetchCampaignDetail(id, AbortSignal.any([signal, AbortSignal.timeout(15_000)])), staleTime: 0, retry: false, networkMode: 'always' });
        // Auxiliary errors/slow responses must not prevent confirming the main record.
        void Promise.allSettled([
          ...shared.map(queryKey => client.refetchQueries({ queryKey, type: 'active' })),
          client.refetchQueries({ predicate: query => query.queryKey[0] === 'admin' && query.queryKey[1] === 'campaign-detail' && query.queryKey[2] === session?.user.id && query.queryKey[3] === id && query.queryKey[4] !== 'record', type: 'active' }),
        ]);
        return record;
      },
    });
  });
  useEffect(() => { controller.activate(); return () => controller.dispose(); }, [controller]);
  return { state, controller };
}
