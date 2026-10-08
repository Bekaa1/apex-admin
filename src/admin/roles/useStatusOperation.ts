import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useAuthSession } from '../../auth/useAuthSession';
import { permissionIssue, permissionKey } from '../../auth/permissions';
import { requireSupabase } from '../../lib/supabase';
import { fetchCampaignDetail } from '../campaigns/details/api';
import { fetchInvoiceDetail } from '../invoices/details/api';
import { uuid } from './api';

type Operation = 'pause' | 'resume' | 'cancelInvoice';
type Issue = 'forbidden' | 'not_authenticated' | 'not_found' | 'invalid_status' | 'unavailable' | 'uncertain' | 'refresh_failed';
type State = { busy: boolean; blocked: boolean; issue: Issue | null; saved: boolean };
const initial: State = { busy: false, blocked: false, issue: null, saved: false };
function issueOf(error: unknown): Issue {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = String(value.message ?? ''), code = String(value.code ?? '');
  if (code === '42501' || message === 'forbidden') return 'forbidden';
  if (code === 'PGRST301' || message === 'not_authenticated') return 'not_authenticated';
  if (message === 'not_found' || message === 'invalid_status') return message;
  if (code === 'PGRST202' || code === '42883') return 'unavailable';
  return 'uncertain';
}
async function send({ id, operation }: { id: string; operation: Operation }) {
  const sb = requireSupabase(), signal = AbortSignal.timeout(20_000);
  const result = operation === 'cancelInvoice'
    ? await sb.rpc('admin_cancel_invoice', { p_invoice_id: uuid(id) }).abortSignal(signal)
    : await sb.rpc('admin_set_campaign_paused', { p_id: uuid(id), p_paused: operation === 'pause' }).abortSignal(signal);
  if (result.error) throw result.error;
  // The returned string is not used as local state; always re-read the record.
}

export function useStatusOperation(kind: 'campaign' | 'invoice', id: string) {
  const { session } = useAuthSession(), client = useQueryClient();
  const key = ['admin', 'role-operation', session?.user.id, kind, id];
  const recordKey = ['admin', kind === 'invoice' ? 'invoice-detail' : 'campaign-detail', session?.user.id, id, 'record'];
  const permission = kind === 'invoice' ? 'invoices' : 'moderate';
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const stateQuery = useQuery<State>({ queryKey: key, queryFn: async () => initial, initialData: initial, enabled: false, gcTime: Infinity, staleTime: Infinity });
  const mutation = useMutation({ mutationFn: send, retry: false, networkMode: 'always', gcTime: 0 });
  const state = { ...stateQuery.data, busy };
  const authorized = () => permissionIssue(client, session, permission);
  const change = (next: State) => {
    if (!authorized()) client.setQueryData(key, next);
  };
  const refreshRecord = async () => {
    if (authorized()) throw new Error('forbidden');
    await client.cancelQueries({ queryKey: recordKey });
    if (authorized()) throw new Error('forbidden');
    const row = await client.fetchQuery({ queryKey: recordKey, queryFn: async ({ signal }) => {
      const timeout = AbortSignal.any([signal, AbortSignal.timeout(15_000)]);
      return kind === 'invoice' ? await fetchInvoiceDetail(id, timeout) : await fetchCampaignDetail(id, timeout);
    }, staleTime: 0, retry: false, networkMode: 'always' });
    if (authorized()) throw new Error('forbidden');
    return row;
  };
  const reconcile = async (operation?: Operation, acknowledged = false) => {
    try {
      const row = await refreshRecord();
      const expected = operation === 'cancelInvoice' ? row?.status === 'cancelled' : operation === 'pause' ? row?.status === 'paused'
        : operation === 'resume' ? ['active', 'awaiting_payment', 'budget_ended'].includes(row?.status ?? '') : false;
      const previous = client.getQueryData<State>(key) ?? initial;
      // Even a successful SELECT of the old status does not prove a timed-out
      // mutation cannot commit later. Keep its lock; no automatic retries.
      change({ busy: false, saved: acknowledged && expected,
        blocked: previous.blocked && !(acknowledged && expected),
        issue: !row ? 'not_found' : previous.blocked && !(acknowledged && expected) ? previous.issue ?? 'uncertain' : acknowledged ? null : previous.issue });
    } catch { change({ busy: false, saved: false, blocked: true, issue: 'refresh_failed' }); }
  };
  const submit = async (operation: Operation) => {
    if (lock.current || state.busy || state.blocked) return;
    lock.current = true;
    const authIssue = authorized();
    if (authIssue) { lock.current = false; void client.invalidateQueries({ queryKey: permissionKey(session) }); return; }
    setBusy(true);
    const record = client.getQueryState<{ status: string | null } | null>(recordKey);
    const expected = operation === 'pause' ? 'active' : operation === 'resume' ? 'paused' : 'unpaid';
    if ((kind === 'invoice') !== (operation === 'cancelInvoice') || record?.status !== 'success' || record.fetchStatus !== 'idle' || record.data?.status !== expected) {
      change({ busy: true, saved: false, blocked: false, issue: 'invalid_status' });
      try { await reconcile(); } finally { lock.current = false; setBusy(false); }
      return;
    }
    change({ busy: true, blocked: true, saved: false, issue: null });
    try {
      await mutation.mutateAsync({ id, operation });
      await reconcile(operation, true);
    } catch (error) {
      const issue = issueOf(error);
      change({ busy: false, blocked: true, saved: false, issue });
      if (issue === 'uncertain' || issue === 'invalid_status') await reconcile(operation);
      if (issue === 'forbidden' || issue === 'not_authenticated') void client.invalidateQueries({ queryKey: permissionKey(session) });
    } finally {
      if (!authorized()) {
        const prefixes = kind === 'invoice' ? ['invoices', 'campaign-detail', 'overview', 'audit'] : ['campaigns', 'overview', 'audit'];
        for (const prefix of prefixes) void client.invalidateQueries({ queryKey: ['admin', prefix] });
      }
      lock.current = false;
      setBusy(false);
    }
  };
  const refresh = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    change({ ...state, busy: true });
    try { await reconcile(); } finally { lock.current = false; setBusy(false); }
  };
  return { state, submit, refresh };
}
