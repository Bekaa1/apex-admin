import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { matchesReview, type InvoiceDetail } from '../details/model';
import { markInvoicePaid } from './api';
import { refreshInvoiceCaches } from './cache';
import { createPaymentController, resumePayment, type PaymentState } from './controller';
import { PaymentError } from './model';

/** One session provider and RequireAdmin result; no second authorization request. */
export function usePayment(id: string) {
  const { session } = useAuthSession();
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: markInvoicePaid, retry: false, networkMode: 'always', gcTime: 0 });
  const operationKey = ['admin', 'invoice-payment', session?.user.id, id];
  const [state, setState] = useState(() => resumePayment(client.getQueryData<PaymentState>(operationKey)));
  const [controller] = useState(() => {
    const roleKey = ['admin-access', session?.user.id, session?.expires_at];
    const recordKey = ['admin', 'invoice-detail', session?.user.id, id, 'record'];
    const authorize = (): 'not_authenticated' | 'forbidden' | null => {
      if (!session?.expires_at || session.expires_at * 1000 <= Date.now()) return 'not_authenticated';
      const role = client.getQueryState(roleKey);
      return role?.status === 'success' && role.data === true && role.fetchStatus === 'idle' ? null : 'forbidden';
    };
    return createPaymentController({
      authorize,
      matches: review => {
        const query = client.getQueryState<InvoiceDetail | null>(recordKey);
        return query?.status === 'success' && query.fetchStatus === 'idle' && matchesReview(query.data, review);
      },
      send: invoiceId => mutation.mutateAsync(invoiceId),
      refresh: () => {
        if (!session) throw new PaymentError('not_authenticated');
        return refreshInvoiceCaches(client, session.user.id, id, authorize);
      },
      changed: next => {
        // Retain an attempted operation across route changes/role refetches in this session.
        // Existing logout/user-change QueryClient.clear() removes this state as well.
        if (client.getQueryData(roleKey) === true && session?.expires_at && session.expires_at * 1000 > Date.now()) {
          client.setQueryDefaults(operationKey, { gcTime: Infinity });
          client.setQueryData(operationKey, next);
        }
        setState(next);
      },
      denied: () => { client.setQueryData(roleKey, false); client.removeQueries({ queryKey: ['admin'] }); },
    }, client.getQueryData<PaymentState>(operationKey));
  });
  useEffect(() => { controller.activate(); return () => controller.dispose(); }, [controller]);
  return { state, controller };
}
