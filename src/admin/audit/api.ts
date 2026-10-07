import { requireSupabase } from '../../lib/supabase';
import { AUDIT_PAGE_SIZE, auditBounds, type AuditEvent, type AuditPageData, type AuditSelection } from './model';

/** No SELECT/RLS evidence for administrators exists in this checkout.
 * Enable only in a reviewed change after server access and source are confirmed.
 * Deliberately not controlled by env, URL, localStorage, or the client role check.
 */
export const AUDIT_ACCESS: Readonly<{ confirmed: boolean }> = Object.freeze({ confirmed: false });
export type AuditErrorKind = 'unconfigured' | 'denied' | 'missing' | 'unavailable' | 'invalid';
export class AuditReadError extends Error {
  readonly kind: AuditErrorKind;
  constructor(kind: AuditErrorKind) { super('Audit read failed'); this.name = 'AuditReadError'; this.kind = kind; }
}

function requireAuditAccess() {
  if (!AUDIT_ACCESS.confirmed) throw new AuditReadError('unconfigured');
}
function responseError(code: string | undefined, status: number): AuditReadError {
  return new AuditReadError(status === 401 || status === 403 || code === '42501' ? 'denied'
    : code === '42P01' || code === 'PGRST205' ? 'missing' : 'unavailable');
}

/** Prepared table adapter, inactive until administrative SELECT is confirmed.
 * count refers only to rows visible to the current server role, never all events.
 */
export async function fetchAuditPage(selection: AuditSelection, today: string, signal: AbortSignal): Promise<AuditPageData> {
  requireAuditAccess();
  if (selection.error) throw new AuditReadError('invalid');
  try {
    const { filters, page } = selection;
    const bounds = auditBounds(filters, today);
    let request = requireSupabase().from('audit_log')
      .select('id,created_at,actor_user_id,action,entity_type,entity_id', { count: 'exact' });
    if (bounds) request = request.gte('created_at', bounds.from).lt('created_at', bounds.until);
    // Exact equality; strings are neither interpreted as UUIDs nor inserted into raw filter expressions.
    if (filters.action !== '') request = request.eq('action', filters.action);
    if (filters.entityType !== '') request = request.eq('entity_type', filters.entityType);
    if (filters.actorId !== '') request = request.eq('actor_user_id', filters.actorId);
    if (filters.entityId !== '') request = request.eq('entity_id', filters.entityId);
    const offset = (page - 1) * AUDIT_PAGE_SIZE;
    const { data, error, status, count } = await request
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + AUDIT_PAGE_SIZE - 1).abortSignal(signal);
    if (error) throw responseError(error.code, status);
    if (!Array.isArray(data)) throw new AuditReadError('invalid');
    return { rows: data, count: typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : null };
  } catch (error) {
    if (error instanceof AuditReadError) throw error;
    throw new AuditReadError('unavailable');
  }
}

/** before/after are requested only after opening an event. No mutations or metadata logging. */
export async function fetchAuditEvent(id: string, signal: AbortSignal): Promise<AuditEvent | null> {
  requireAuditAccess();
  try {
    const { data, error, status } = await requireSupabase().from('audit_log')
      .select('id,created_at,actor_user_id,action,entity_type,entity_id,before,after')
      .eq('id', id).abortSignal(signal).maybeSingle();
    if (error) throw responseError(error.code, status);
    return data;
  } catch (error) {
    if (error instanceof AuditReadError) throw error;
    throw new AuditReadError('unavailable');
  }
}
