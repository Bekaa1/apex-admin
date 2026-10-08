import type { QueryClient } from '@tanstack/react-query';
import { fetchInvoiceDetail } from '../details/api';
import type { InvoiceDetail } from '../details/model';
import { InvoiceReadError } from '../api';
import { PaymentError } from './model';

/** Re-read authoritative invoice; auxiliary refetches do not block its result. */
export async function refreshInvoiceCaches(client: QueryClient, userId: string, id: string, authorize: () => 'not_authenticated' | 'forbidden' | null) {
  const detailKey = ['admin', 'invoice-detail', userId, id];
  const recordKey = [...detailKey, 'record'];
  const previous = client.getQueryData<InvoiceDetail | null>(recordKey);
  const shared = [['admin', 'invoices'], ['admin', 'campaigns'], ['admin', 'overview'], ['admin', 'audit'],
    ...(previous?.ad_id ? [['admin', 'campaign-detail', userId, previous.ad_id]] : [])];
  await client.cancelQueries({ queryKey: detailKey });
  await Promise.all([...shared, detailKey].map(queryKey => client.invalidateQueries({ queryKey, refetchType: 'none' })));
  const issue = authorize();
  if (issue) throw new PaymentError(issue);
  const record = client.fetchQuery({ queryKey: recordKey,
    queryFn: ({ signal }) => fetchInvoiceDetail(id, AbortSignal.any([signal, AbortSignal.timeout(15_000)])),
    staleTime: 0, retry: false, networkMode: 'always',
  });
  void Promise.allSettled([
    ...shared.map(queryKey => client.refetchQueries({ queryKey, type: 'active' })),
    client.refetchQueries({ predicate: query => query.queryKey[0] === 'admin' && query.queryKey[1] === 'invoice-detail'
      && query.queryKey[2] === userId && query.queryKey[3] === id && query.queryKey[4] !== 'record', type: 'active' }),
  ]);
  try {
    const row = await record;
    const latestIssue = authorize();
    if (latestIssue) throw new PaymentError(latestIssue);
    if (row && row.ad_id !== previous?.ad_id) {
      const key = ['admin', 'campaign-detail', userId, row.ad_id];
      await client.invalidateQueries({ queryKey: key, refetchType: 'none' });
      if (!authorize()) void client.refetchQueries({ queryKey: key, type: 'active' });
    }
    return row;
  } catch (error) {
    if (error instanceof InvoiceReadError && error.kind === 'denied') throw new PaymentError('forbidden');
    throw error;
  }
}
