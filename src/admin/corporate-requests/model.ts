import type { Database } from '../../lib/database.types';
import { listReturnTo } from '../../navigation/returnTo';
import { isCorporateRequest } from '../overview/model';

export type CorporateRequestDetails = Database['public']['Tables']['corporate_requests']['Row'];
export const CORPORATE_LIST = '/admin/corporate-requests';

export function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isRequestDetails(value: unknown): value is CorporateRequestDetails {
  if (!isCorporateRequest(value)) return false;
  const row = value as unknown as Record<string, unknown>;
  return isRequestId(row.id) && typeof row.phone === 'string' && typeof row.updated_at === 'string'
    && ['contact_name', 'email', 'message', 'manager_comment', 'user_id'].every((field) => row[field] === null || typeof row[field] === 'string');
}

export function corporateReturnTo(state: unknown): string {
  // The overview also contains the existing latest-requests list.
  if (state && typeof state === 'object' && 'returnTo' in state && state.returnTo === '/admin') return '/admin';
  return listReturnTo(state, CORPORATE_LIST);
}

/** Preserve original line breaks and whitespace in non-empty server text. */
export function requestText(value: string | null, fallback: string): string {
  return value?.trim() ? value : fallback;
}
