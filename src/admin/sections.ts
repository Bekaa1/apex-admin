import type { IconName } from '../design-system';

export interface AdminSection { path: string; labelKey: string; icon: IconName; placeholder?: boolean; secondary?: boolean }

/** Administrative navigation only; no advertiser routes or actions. */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { path: '/admin', labelKey: 'adminShell.sections.overview', icon: 'home' },
  { path: '/admin/campaigns', labelKey: 'adminShell.sections.campaigns', icon: 'megaphone' },
  { path: '/admin/moderation', labelKey: 'adminShell.sections.moderation', icon: 'shield-check' },
  { path: '/admin/invoices', labelKey: 'adminShell.sections.invoices', icon: 'receipt' },
  { path: '/admin/clients', labelKey: 'adminShell.sections.clients', icon: 'user' },
  { path: '/admin/stores', labelKey: 'adminShell.sections.stores', icon: 'store' },
  { path: '/admin/store-requests', labelKey: 'adminStoreRequests.title', icon: 'store' },
  { path: '/admin/equipment', labelKey: 'adminShell.sections.equipment', icon: 'cart' },
  { path: '/admin/tariffs', labelKey: 'adminShell.sections.tariffs', icon: 'credit-card' },
  { path: '/admin/corporate-requests', labelKey: 'adminShell.sections.corporate', icon: 'briefcase' },
  // Preserve previously implemented sections in a separate secondary menu group.
  { path: '/admin/audit', labelKey: 'adminAudit.title', icon: 'clock', secondary: true },
  { path: '/admin/media', labelKey: 'adminMedia.title', icon: 'video', secondary: true },
];

export function adminSectionFor(pathname: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find((section) => pathname === section.path || section.path !== '/admin' && pathname.startsWith(section.path + '/'));
}
