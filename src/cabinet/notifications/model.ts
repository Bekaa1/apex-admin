import type { Json } from '../../lib/database.types';
import { CABINET_LINKS } from '../sections';
import type { NotificationRow } from './api';

export type NotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface NotificationView {
  id: string;
  /** Ready Russian text from the backend; it has no other languages yet. */
  title: string;
  body: string;
  tone: NotificationTone;
  unread: boolean;
  createdAt: string;
  /** Where the notification leads; null when it only informs. */
  link: string | null;
  /** Codes of the broken rules of a rejected campaign, texts in `campaigns.rules.*`. */
  rules: string[];
}

const TONES: NotificationTone[] = ['info', 'success', 'warning', 'error'];

function linkOf({ action, ad_id: adId }: NotificationRow): string | null {
  switch (action) {
    case 'create_campaign':
      return CABINET_LINKS.newCampaign;
    case 'topup':
      return adId ? CABINET_LINKS.campaignTopUp(adId) : null;
    // The invoice to pay is shown on the campaign card.
    case 'open_campaign':
    case 'pay_invoice':
      return adId ? CABINET_LINKS.campaign(adId) : null;
    default:
      return null;
  }
}

function rulesOf(data: Json): string[] {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return [];
  const reasons = data.reasons;
  return Array.isArray(reasons) ? reasons.filter((code): code is string => typeof code === 'string') : [];
}

export function toNotificationView(row: NotificationRow): NotificationView {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tone: TONES.find((tone) => tone === row.severity) ?? 'info',
    unread: row.read_at === null,
    createdAt: row.created_at,
    link: linkOf(row),
    rules: rulesOf(row.data),
  };
}
