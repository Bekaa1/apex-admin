import type { QueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

export const ROLES = ['admin', 'owner', 'accountant', 'moderator', 'manager', 'director', 'marketer', 'client'] as const;
export type Role = typeof ROLES[number];
export type Permission = 'panel' | 'overview' | 'campaigns' | 'moderate' | 'invoices' | 'clients' | 'stores' | 'equipment' | 'storeRequests' | 'tariffs' | 'corporate' | 'audit' | 'media' | 'team' | 'partner' | 'cartRoute';
const GRANTS: Record<Permission, readonly Role[]> = {
  panel: ['accountant', 'moderator', 'manager', 'director', 'marketer'],
  overview: ['accountant', 'moderator'], campaigns: ['accountant', 'moderator'], moderate: ['moderator'],
  invoices: ['accountant'], clients: ['accountant', 'moderator'], stores: ['accountant', 'moderator', 'manager'],
  equipment: ['manager'], storeRequests: ['manager'], tariffs: ['accountant'], corporate: ['moderator'],
  audit: [], media: ['moderator'], team: [], partner: ['director', 'marketer'], cartRoute: ['manager', 'director', 'marketer'],
};
export function isRole(value: unknown): value is Role { return typeof value === 'string' && ROLES.some(role => role === value); }
export function parseRoles(value: unknown): Role[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) throw new Error('Invalid permissions response');
  // Unknown roles never grant permissions.
  return [...new Set(value.filter(isRole))].sort();
}
export function can(roles: readonly Role[], permission: Permission): boolean {
  return roles.includes('admin') || roles.includes('owner') || GRANTS[permission].some(role => roles.includes(role));
}
export function isPermission(value: unknown): value is Permission { return typeof value === 'string' && Object.hasOwn(GRANTS, value); }
/** Applied to route definitions, never to an untrusted/raw browser pathname. */
export function adminRoutePermission(path: string): Permission | undefined {
  if (path === '/admin' || path === '/admin/') return 'overview';
  const relative = path.replace(/^\/admin\//, '');
  if (relative === 'stores/new' || relative.startsWith('stores/new/') || relative.split('/')[0] === 'store-requests') return 'storeRequests';
  if (relative.startsWith('partner/')) return 'partner';
  const sections: Record<string, Permission> = { campaigns: 'campaigns', moderation: 'moderate', invoices: 'invoices', clients: 'clients', stores: 'stores',
    equipment: 'equipment', 'cart-routes': 'cartRoute', tariffs: 'tariffs', 'corporate-requests': 'corporate', audit: 'audit', media: 'media', team: 'team' };
  return sections[relative.split('/')[0]];
}
export function panelHome(roles: readonly Role[]): string {
  if (can(roles, 'overview')) return '/admin';
  if (can(roles, 'stores')) return '/admin/stores';
  if (can(roles, 'partner')) return '/admin/partner/stores';
  return '/access-denied';
}
export const permissionKey = (session: Session | null) => ['apex-permissions', session?.user.id, session?.expires_at] as const;

/** Mutation controllers re-check the current session and shared permission cache before sending. */
export function permissionIssue(client: QueryClient, session: Session | null, permission: Permission): 'not_authenticated' | 'forbidden' | null {
  if (!session?.expires_at || session.expires_at * 1000 <= Date.now()) return 'not_authenticated';
  const query = client.getQueryState<Role[]>(permissionKey(session));
  return query?.status === 'success' && query.fetchStatus === 'idle' && can(query.data ?? [], permission) ? null : 'forbidden';
}
