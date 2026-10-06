import type { BadgeTone } from '../design-system';
import type { Database } from '../lib/database.types';

/** `ad_status` enum of the backend. */
export type CampaignStatus = Database['public']['Enums']['ad_status'];

/** Statuses an advertiser can see; labels live in `cabinet.status.*`. */
export type VisibleStatus = Exclude<CampaignStatus, 'deleted'>;

export const STATUS_TONE: Record<VisibleStatus, BadgeTone> = {
  active: 'success',
  pending: 'brand',
  draft: 'neutral',
  paused: 'warning',
  rejected: 'danger',
  budget_ended: 'danger',
  hours_ended: 'warning',
  completed: 'neutral',
  archived: 'neutral',
};

export function statusLabelKey(status: VisibleStatus): string {
  return `cabinet.status.${status}`;
}
