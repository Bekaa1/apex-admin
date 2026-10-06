import type { BadgeTone } from '../design-system';

/** `ad_status` enum of the backend. */
export type CampaignStatus =
  | 'pending'
  | 'active'
  | 'rejected'
  | 'draft'
  | 'archived'
  | 'deleted'
  | 'paused'
  | 'hours_ended'
  | 'budget_ended'
  | 'completed';

/** Statuses an advertiser can see; labels live in `cabinet.status.*`. */
export type VisibleStatus = Exclude<CampaignStatus, 'deleted'>;

export const STATUS_TONE: Record<VisibleStatus, BadgeTone> = {
  active: 'success',
  pending: 'brand',
  draft: 'neutral',
  paused: 'warning',
  rejected: 'danger',
  budget_ended: 'warning',
  hours_ended: 'warning',
  completed: 'neutral',
  archived: 'neutral',
};

export function statusLabelKey(status: VisibleStatus): string {
  return `cabinet.status.${status}`;
}
