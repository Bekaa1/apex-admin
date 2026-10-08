import { isStoreId } from '../model';

export const WIZARD_PATH = '/admin/stores/new';
export const STORE_REQUEST_LIST = '/admin/store-requests';
export const STEPS = ['details', 'plan', 'zoning', 'review'] as const;
export type Step = typeof STEPS[number];
export const FIELDS = ['name', 'city', 'address', 'timezone'] as const;
export type Field = typeof FIELDS[number];
export type StoreFields = Record<Field, string>;
export type FieldErrors = Partial<Record<Field, string>>;
export const EMPTY_FIELDS: StoreFields = { name: '', city: '', address: '', timezone: 'Asia/Almaty' };
export interface StoreRequest extends StoreFields {
  id: string; revision: number; status: string; is_mine: boolean;
  review_comment: string | null; published_store_id: string | null;
  submitted_at?: string | null;
  plan?: { plan_data: unknown; source_file_name: string | null } | null;
  zones?: unknown;
  assignments?: unknown;
}
export function trimmed(values: StoreFields): StoreFields {
  return Object.fromEntries(FIELDS.map(field => [field, values[field].trim()])) as StoreFields;
}
export function validate(values: StoreFields, continueNext: boolean): FieldErrors {
  const v = trimmed(values);
  const errors: FieldErrors = {};
  if (Array.from(v.name).length < 2 || Array.from(v.name).length > 120) errors.name = 'nameLength';
  if (Array.from(v.city).length > 80) errors.city = 'cityLength';
  else if (continueNext && !v.city) errors.city = 'required';
  if (Array.from(v.address).length > 200) errors.address = 'addressLength';
  else if (continueNext && !v.address) errors.address = 'required';
  if (!v.timezone) errors.timezone = 'required';
  return errors;
}
export function canEdit(request: StoreRequest): boolean {
  return request.is_mine && ['inactive', 'rejected'].includes(request.status);
}
export function sameFields(request: StoreFields, values: StoreFields): boolean {
  return FIELDS.every(field => request[field] === values[field]);
}
export function requestPath(id: string | undefined, step: Step = 'details'): string {
  if (id && !isStoreId(id)) throw new Error('Invalid request ID');
  return `${WIZARD_PATH}${id ? '/' + id : ''}?step=${step}`;
}
export function requestKey(userId: string, id: string) { return ['admin', 'store-request', userId, id.toLowerCase()] as const; }

/** Json is the generated return type; never trust an unchecked cast as a record. */
export function parseRequest(data: unknown, expectedId: string): StoreRequest {
  const envelope = data as { request?: unknown; plan?: unknown; zones?: unknown; assignments?: unknown } | null;
  const value = envelope?.request;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_response');
  const r = value as Record<string, unknown>;
  if (!isStoreId(r.id) || r.id.toLowerCase() !== expectedId.toLowerCase()
    || typeof r.revision !== 'number' || !Number.isSafeInteger(r.revision) || r.revision < 1
    || typeof r.status !== 'string' || !r.status || typeof r.is_mine !== 'boolean'
    || FIELDS.some(field => r[field] !== null && typeof r[field] !== 'string')
    || (r.review_comment !== null && typeof r.review_comment !== 'string')
    || (r.submitted_at != null && typeof r.submitted_at !== 'string')
    || (r.published_store_id !== null && !isStoreId(r.published_store_id))) throw new Error('invalid_response');
  const plan = envelope?.plan as Record<string, unknown> | null | undefined;
  if (plan != null && (typeof plan !== 'object' || Array.isArray(plan) || !Object.hasOwn(plan, 'plan_data')
    || (plan.source_file_name !== null && typeof plan.source_file_name !== 'string'))) throw new Error('invalid_response');
  return {
    id: r.id, revision: r.revision, status: r.status, is_mine: r.is_mine,
    name: r.name as string | null ?? '', city: r.city as string | null ?? '',
    address: r.address as string | null ?? '', timezone: r.timezone as string | null ?? '',
    review_comment: r.review_comment as string | null, published_store_id: r.published_store_id as string | null,
    submitted_at: r.submitted_at as string | null ?? null,
    plan: plan == null ? null : { plan_data: plan.plan_data, source_file_name: plan.source_file_name as string | null },
    zones: envelope?.zones, assignments: envelope?.assignments,
  };
}
