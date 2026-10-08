import { isStoreId } from '../model';
import { normalizeRows, type RequestItem, type RowDiagnostic } from '../requests/model';
import type { StoreRequest } from '../onboarding/model';

export const OWNER_QUEUE = '/admin/store-requests/pending';
export const ownerRequestPath = (id: string) => {
  if (!isStoreId(id)) throw new Error('invalid_response');
  return `/admin/store-requests/${id}/review`;
};
export interface OwnerRow extends RequestItem { timezone: string }
export interface OwnerList { rows: OwnerRow[]; skipped: number; received: number }
export function normalizeQueue(data: unknown, report: (issue: RowDiagnostic) => void): OwnerList {
  if (!Array.isArray(data)) throw new Error('invalid_response');
  const normalized = normalizeRows(data, report), rows: OwnerRow[] = [];
  const source = new Map<string, Record<string, unknown>>();
  for (const row of data) if (row && typeof row.id === 'string' && !source.has(row.id.toLowerCase())) source.set(row.id.toLowerCase(), row);
  for (const row of normalized.rows) {
    if (row.status !== 'pending_owner_approval') continue;
    const timezone: unknown = source.get(row.id)?.timezone;
    if (timezone !== null && typeof timezone !== 'string') { report({ index: data.indexOf(source.get(row.id)), fields: ['timezone'] }); continue; }
    rows.push({ ...row, timezone: timezone?.trim() ?? '' });
  }
  rows.sort((a, b) => (a.submittedAt ? Date.parse(a.submittedAt) : Infinity) - (b.submittedAt ? Date.parse(b.submittedAt) : Infinity) || a.id.localeCompare(b.id));
  return { rows, skipped: normalized.skipped + normalized.rows.filter(row => row.status === 'pending_owner_approval').length - rows.length, received: data.length };
}
export type Decision = 'approve' | 'reject';
export const validComment = (comment: string) => { const length = Array.from(comment.trim()).length; return length >= 3 && length <= 1000; };
export const canDecide = (owner: boolean, record: StoreRequest) => owner === true && record.status === 'pending_owner_approval';
