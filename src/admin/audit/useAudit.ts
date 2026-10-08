import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '../../auth/useAuthSession';
import { AUDIT_ACCESS, fetchAuditEvent, fetchAuditPage } from './api';
import type { AuditSelection } from './model';

/** Both hooks are mounted only below RequireAdmin; the independent source gate stays closed. */
export function useAuditPage(selection: AuditSelection, today: string) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'audit', session?.user.id, selection, today],
    enabled: AUDIT_ACCESS.confirmed && status === 'ready' && Boolean(session) && !selection.error,
    queryFn: ({ signal }) => fetchAuditPage(selection, today, signal),
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}

export function useAuditEvent(id: string) {
  const { session, status } = useAuthSession();
  return useQuery({
    queryKey: ['admin', 'audit-event', session?.user.id, id],
    enabled: AUDIT_ACCESS.confirmed && status === 'ready' && Boolean(session),
    queryFn: ({ signal }) => fetchAuditEvent(id, signal),
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  });
}
