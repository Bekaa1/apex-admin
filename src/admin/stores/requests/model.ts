import type { BadgeTone } from '../../../design-system';
import { adminStatusTone } from '../../statusTone';
import type { Database } from '../../../lib/database.types';
import { isStoreId, storeDetailPath } from '../model';
import { requestPath, type Step } from '../onboarding/model';

export type ListContract = Database['public']['Functions']['admin_list_store_requests']['Returns'][number];
export const STATUSES = ['inactive', 'pending_owner_approval', 'approved', 'rejected'] as const;
export type RequestStatus = typeof STATUSES[number];
export const PAGE_SIZE = 25;
export const SEARCH_LIMIT = 256;
export interface RequestItem {
  id: string; name: string; city: string; address: string; status: string;
  updatedAt: string | null; submittedAt: string | null; publishedStoreId: string | null;
  hasPlan: boolean; zoneCount: number; isMine: boolean; reviewComment: string;
}
export interface ListSelection { status: RequestStatus | ''; search: string; page: number; invalid: boolean }
export interface ListData { rows: RequestItem[]; skipped: number; received: number }
export function isStatus(value: string): value is RequestStatus { return (STATUSES as readonly string[]).includes(value); }
export function statusTone(status: string): BadgeTone {
  return adminStatusTone('storeRequest', status);
}
export function nextStep(row: RequestItem): Step {
  if (!row.isMine || !['inactive', 'rejected'].includes(row.status)) return 'review';
  if (![row.name, row.city, row.address].every(value => value.trim())) return 'details';
  if (!row.hasPlan) return 'plan';
  if (row.zoneCount === 0) return 'zoning';
  return 'review';
}
export function requestAction(row: RequestItem): { href: string; label: 'continue' | 'open' | 'openStore' } {
  if (row.status === 'approved' && row.publishedStoreId) return { href: storeDetailPath(row.publishedStoreId), label: 'openStore' };
  const editable = row.isMine && ['inactive', 'rejected'].includes(row.status);
  return { href: requestPath(row.id, nextStep(row)), label: editable ? 'continue' : 'open' };
}
export function searchRows(rows: RequestItem[], search: string): RequestItem[] {
  const needle = search.trim().toLowerCase();
  return needle ? rows.filter(row => [row.name, row.city, row.address].some(value => value.toLowerCase().includes(needle))) : rows;
}
export function readSelection(params: URLSearchParams): ListSelection {
  const status = params.get('status') ?? '', search = params.get('search') ?? '', rawPage = params.get('page') ?? '1';
  const page = Number(rawPage);
  const invalid = (status !== '' && !isStatus(status)) || search.length > SEARCH_LIMIT
    || !/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(page) || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE)
    || ['status', 'search', 'page'].some(key => params.getAll(key).length > 1);
  return { status: isStatus(status) ? status : '', search, page: invalid ? 1 : page, invalid };
}
export function selectionParams(status: RequestStatus | '', search: string, page = 1): URLSearchParams {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (page > 1) params.set('page', String(page));
  return params;
}

export interface RowDiagnostic { index: number; fields: string[] }
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const nullableDate = (value: unknown) => value === null || typeof value === 'string' && Number.isFinite(Date.parse(value));
/** Generated non-null strings are nullable at runtime. Normalize once, before UI/search. */
export function normalizeRows(data: unknown, report: (issue: RowDiagnostic) => void): ListData {
  if (!Array.isArray(data)) throw new Error('invalid_response');
  const rows: RequestItem[] = [], seen = new Set<string>();
  data.forEach((value: unknown, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { report({ index, fields: ['row'] }); return; }
    const row = value as Record<string, unknown>, fields: string[] = [];
    if (!isStoreId(row.id) || seen.has(String(row.id).toLowerCase())) fields.push('id');
    if (typeof row.status !== 'string' || !row.status.trim()) fields.push('status');
    for (const key of ['name', 'city', 'address', 'review_comment']) if (!nullableString(row[key])) fields.push(key);
    for (const key of ['updated_at', 'submitted_at']) if (!nullableDate(row[key])) fields.push(key);
    if (row.published_store_id !== null && !isStoreId(row.published_store_id)) fields.push('published_store_id');
    if (typeof row.has_plan !== 'boolean') fields.push('has_plan');
    if (typeof row.is_mine !== 'boolean') fields.push('is_mine');
    if (typeof row.zone_count !== 'number' || !Number.isSafeInteger(row.zone_count) || row.zone_count < 0) fields.push('zone_count');
    if (fields.length) { report({ index, fields }); return; }
    const id = (row.id as string).toLowerCase(); seen.add(id);
    rows.push({ id, name: (row.name as string | null)?.trim() ?? '', city: (row.city as string | null)?.trim() ?? '', address: (row.address as string | null)?.trim() ?? '',
      status: row.status as string, updatedAt: row.updated_at as string | null, submittedAt: row.submitted_at as string | null,
      publishedStoreId: row.published_store_id as string | null, hasPlan: row.has_plan as boolean, zoneCount: row.zone_count as number,
      isMine: row.is_mine as boolean, reviewComment: (row.review_comment as string | null) ?? '' });
  });
  // RPC orders by updated_at. A stable local tie-breaker preserves loaded rows' ordering.
  rows.sort((a, b) => (b.updatedAt ? Date.parse(b.updatedAt) : -Infinity) - (a.updatedAt ? Date.parse(a.updatedAt) : -Infinity) || a.id.localeCompare(b.id));
  return { rows, skipped: data.length - rows.length, received: data.length };
}
