import { requireSupabase } from '../../lib/supabase';
import { isClientId, clientSearchFilter } from '../clients/model';
import { parseRoles, type Role } from '../../auth/permissions';

export class RoleApiError extends Error {
  readonly kind: 'denied' | 'login' | 'missing' | 'invalid' | 'unavailable' | 'unknown';
  constructor(kind: RoleApiError['kind']) { super(kind); this.kind = kind; }
}
export function roleError(error: unknown, mutation = false): RoleApiError {
  if (error instanceof RoleApiError) return error;
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = String(value.code ?? ''), message = String(value.message ?? '');
  if (code === '42501' || message === 'forbidden') return new RoleApiError('denied');
  if (message === 'not_authenticated' || code === 'PGRST301') return new RoleApiError('login');
  if (message === 'not_found') return new RoleApiError('missing');
  if (/^invalid_|^code_taken$/.test(message)) return new RoleApiError('invalid');
  // Never render raw PostgREST/SQL details or personal data.
  return new RoleApiError(mutation ? 'unknown' : 'unavailable');
}
export const textValue = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RoleApiError('invalid');
  return value as Record<string, unknown>;
}
export function uuid(value: unknown): string {
  if (!isClientId(value)) throw new RoleApiError('invalid');
  return value;
}
export interface TeamMember { id: string; name: string; email: string; phone: string; roles: Role[]; partnerId: string | null; partnerName: string }
export async function readTeam(page: number, signal: AbortSignal) {
  const start = (page - 1) * 25;
  const { data, error } = await requireSupabase().rpc('admin_list_team').order('full_name', { nullsFirst: false }).order('user_id').range(start, start + 25).abortSignal(signal);
  if (error) throw roleError(error);
  if (!Array.isArray(data)) throw new RoleApiError('invalid');
  const rows = data.slice(0, 25).map(value => {
    const row = record(value), roles = parseRoles(row.roles);
    if (row.is_admin === true && !roles.includes('admin')) roles.push('admin');
    return { id: uuid(row.user_id), name: textValue(row.full_name), email: textValue(row.email), phone: textValue(row.phone), roles,
      partnerId: row.partner_id == null ? null : uuid(row.partner_id), partnerName: textValue(row.partner_name) } satisfies TeamMember;
  });
  return { rows, hasNext: data.length > 25 };
}
export type LookupKind = 'user' | 'partner' | 'store';
export interface LookupItem { id: string; label: string }
export async function lookup(kind: LookupKind, search: string, signal: AbortSignal): Promise<LookupItem[]> {
  const term = search.trim();
  if (term.length < 2 || term.length > 120) throw new RoleApiError('invalid');
  const sb = requireSupabase();
  if (kind === 'user') {
    let query = sb.from('users').select('id,full_name,display_name,email');
    query = isClientId(term) ? query.eq('id', term) : query.or(clientSearchFilter(term));
    const { data, error } = await query.order('full_name', { nullsFirst: false }).order('id').limit(25).abortSignal(signal);
    if (error) throw roleError(error);
    return (data ?? []).map(row => ({ id: uuid(row.id), label: [row.full_name || row.display_name, row.email].filter(Boolean).join(' · ') || row.id }));
  }
  const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const query = kind === 'partner' ? sb.from('partners').select('id,name') : sb.from('stores').select('id,name');
  const { data, error } = await query.filter('name', 'imatch', pattern).order('name').order('id').limit(25).abortSignal(signal);
  if (error) throw roleError(error);
  return (data ?? []).map(row => ({ id: uuid(row.id), label: textValue(row.name) || row.id }));
}
export type TeamChange =
  | { kind: 'role'; userId: string; role: 'owner' | 'moderator' | 'accountant' | 'manager'; grant: boolean }
  | { kind: 'member'; userId: string; partnerId: string | null; role: 'director' | 'marketer' | null }
  | { kind: 'store'; storeId: string; partnerId: string | null }
  | { kind: 'partner'; name: string; legalName: string };
export async function changeTeam(change: TeamChange): Promise<string | null> {
  const sb = requireSupabase(), signal = AbortSignal.timeout(20_000);
  try {
    if (change.kind === 'role') {
      const { error } = await sb.rpc('admin_set_user_role', { p_user_id: uuid(change.userId), p_role: change.role, p_grant: change.grant }).abortSignal(signal);
      if (error) throw error;
    } else if (change.kind === 'member') {
      const { error } = await sb.rpc('admin_set_partner_member', { p_user_id: uuid(change.userId), p_partner_id: change.partnerId === null ? null : uuid(change.partnerId), p_role: change.role }).abortSignal(signal);
      if (error) throw error;
    } else if (change.kind === 'store') {
      const { error } = await sb.rpc('admin_set_store_partner', { p_store_id: uuid(change.storeId), p_partner_id: change.partnerId === null ? null : uuid(change.partnerId) }).abortSignal(signal);
      if (error) throw error;
    } else {
      const name = change.name.trim();
      if (!name || name.length > 120) throw new RoleApiError('invalid');
      const { data, error } = await sb.rpc('admin_save_partner', { p_id: null, p_name: name, ...(change.legalName.trim() ? { p_legal_name: change.legalName.trim() } : {}) }).abortSignal(signal);
      if (error) throw error;
      return uuid(data);
    }
    return null;
  } catch (error) { throw roleError(error, true); }
}
