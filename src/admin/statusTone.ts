import type { AlertTone, BadgeTone } from '../design-system';
import type { Database } from '../lib/database.types';

export type AdminStatusTone = Extract<BadgeTone, 'success' | 'danger' | 'neutral' | 'warning' | 'brand'>;

/** Presentation only: these maps never validate a status or decide permissions/transitions.
 * A raw server status_color is deliberately not an input. Unknown values stay neutral.
 */
export const ADMIN_STATUS_TONES = {
  campaign: {
    active: 'success', completed: 'success', rejected: 'danger', budget_ended: 'danger',
    pending: 'brand', awaiting_payment: 'warning', paused: 'warning', hours_ended: 'warning',
    draft: 'neutral', archived: 'neutral', deleted: 'neutral',
  } satisfies Record<Database['public']['Enums']['ad_status'], AdminStatusTone>,
  invoice: { paid: 'success', unpaid: 'danger', cancelled: 'danger', overdue: 'danger', failed: 'danger', pending: 'warning' },
  equipment: {
    active: 'success', online: 'success', offline: 'danger', maintenance: 'warning',
    // Inactive does not establish an outage or fault; keep it distinct from offline.
    inactive: 'neutral', failed: 'danger', error: 'danger', blocked: 'danger', unavailable: 'danger',
  } satisfies Record<Database['public']['Enums']['cart_status'], AdminStatusTone> & Record<string, AdminStatusTone>,
  storeRequest: { inactive: 'neutral', pending_owner_approval: 'warning', approved: 'success', rejected: 'danger' },
  availability: { available: 'success', unavailable: 'danger' },
} as const;

export type AdminStatusDomain = keyof typeof ADMIN_STATUS_TONES;
export function adminStatusTone(domain: AdminStatusDomain, status: string | null | undefined): AdminStatusTone {
  const tones: Readonly<Record<string, AdminStatusTone>> = ADMIN_STATUS_TONES[domain];
  const value = status?.trim().toLowerCase() ?? '';
  return Object.hasOwn(tones, value) ? tones[value] : 'neutral';
}

export function adminStatusAlertTone(domain: AdminStatusDomain, status: string | null | undefined): AlertTone {
  const tone = adminStatusTone(domain, status);
  return tone === 'neutral' || tone === 'brand' ? 'info' : tone;
}

/** Counts are not trends: zero, loading and missing data must not look like a problem. */
export function adminCounterTone(status: string, count: number | null | undefined, failed = false): AdminStatusTone {
  if (failed) return 'danger';
  if (count == null || !Number.isFinite(count) || count <= 0) return 'neutral';
  return adminStatusTone(status === 'unpaid' ? 'invoice' : 'campaign', status);
}
