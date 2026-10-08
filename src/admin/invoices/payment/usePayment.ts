import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import { permissionIssue, permissionKey } from '../../../auth/permissions';
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
    const roleKey = permissionKey(session);
    const recordKey = ['admin', 'invoice-detail', session?.user.id, id, 'record'];
    const authorize = () => permissionIssue(client, session, 'invoices');
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
        if (authorize() === null) {
          client.setQueryDefaults(operationKey, { gcTime: Infinity });
          client.setQueryData(operationKey, next);
        }
        setState(next);
      },
      denied: () => { client.setQueryData(roleKey, []); client.removeQueries({ queryKey: ['admin'] }); },
    }, client.getQueryData<PaymentState>(operationKey));
  });
  useEffect(() => { controller.activate(); return () => controller.dispose(); }, [controller]);
  return { state, controller };
}
