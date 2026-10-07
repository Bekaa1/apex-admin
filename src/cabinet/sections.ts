import type { ComponentType } from 'react';
import type { IconName } from '../design-system';

export interface CabinetSubpage {
  /** Relative to /cabinet. */
  path: string;
  titleKey: string;
  page?: () => Promise<ComponentType>;
  /** The page is the campaign creation flow itself, so the top bar hides «Создать кампанию». */
  hideCreate?: boolean;
}

export interface CabinetSection {
  id: 'home' | 'campaigns' | 'stats' | 'analytics' | 'profile';
  /** Relative to /cabinet; '' is the Home page. */
  path: string;
  labelKey: string;
  /** Shorter label for the phone tab bar. */
  shortLabelKey?: string;
  icon: IconName;
  /** Page component; a section without one renders an empty stub until its owner builds it. */
  page?: () => Promise<ComponentType>;
  /** Nested pages of the section (relative to /cabinet), so owners never edit routes.tsx. */
  subpages?: CabinetSubpage[];
}

/** One entry = a menu item, a tab and a route. */
export const CABINET_SECTIONS: CabinetSection[] = [
  { id: 'home', path: '', labelKey: 'cabinet.nav.home', icon: 'home', page: () => import('./home/HomePage').then((m) => m.HomePage) },
  {
    id: 'campaigns',
    path: 'campaigns',
    labelKey: 'cabinet.nav.campaigns',
    shortLabelKey: 'cabinet.nav.campaignsShort',
    icon: 'megaphone',
    page: () => import('./campaigns/CampaignsPage').then((m) => m.CampaignsPage),
    subpages: [
      { path: 'campaigns/new', titleKey: 'campaigns.titles.new', hideCreate: true, page: () => import('./campaigns/wizard/NewCampaignPage').then((m) => m.NewCampaignPage) },
      { path: 'campaigns/corporate', titleKey: 'campaigns.titles.corporate', page: () => import('./campaigns/corporate/CorporatePage').then((m) => m.CorporatePage) },
      { path: 'campaigns/:campaignId/fix', titleKey: 'campaigns.titles.fix', hideCreate: true, page: () => import('./campaigns/wizard/FixCampaignPage').then((m) => m.FixCampaignPage) },
      { path: 'campaigns/:campaignId/sent', titleKey: 'campaigns.titles.new', hideCreate: true, page: () => import('./campaigns/wizard/CampaignSentPage').then((m) => m.CampaignSentPage) },
      { path: 'campaigns/:campaignId', titleKey: 'cabinet.nav.campaigns' },
    ],
  },
  { id: 'stats', path: 'stats', labelKey: 'cabinet.nav.stats', icon: 'chart' },
  {
    id: 'analytics',
    path: 'analytics',
    labelKey: 'cabinet.nav.analytics',
    icon: 'pie-chart',
    page: () => import('./analytics/AnalyticsPage').then((m) => m.AnalyticsPage),
    subpages: [
      { path: 'analytics/stores/:storeId', titleKey: 'cabinet.nav.analytics', page: () => import('./analytics/StoreDetailsPage').then((m) => m.StoreDetailsPage) },
    ],
  },
  {
    id: 'profile',
    path: 'profile',
    labelKey: 'cabinet.nav.profile',
    icon: 'user',
    page: () => import('./profile/ProfilePage').then((m) => m.ProfilePage),
  },
];

export const CABINET_ROOT = '/cabinet';

/** Route `handle` of cabinet pages: the i18n key of the title in the top bar and whether to hide «Создать кампанию». */
export interface CabinetRouteHandle {
  titleKey: string;
  hideCreate?: boolean;
}

export function routeTitleKey(handle: unknown): string | undefined {
  return typeof handle === 'object' && handle !== null && 'titleKey' in handle && typeof handle.titleKey === 'string' ? handle.titleKey : undefined;
}

export function routeHidesCreate(handle: unknown): boolean {
  return typeof handle === 'object' && handle !== null && 'hideCreate' in handle && handle.hideCreate === true;
}

export function cabinetUrl(path = ''): string {
  return path ? `${CABINET_ROOT}/${path}` : CABINET_ROOT;
}

export const CABINET_LINKS = {
  newCampaign: cabinetUrl('campaigns/new'),
  campaigns: cabinetUrl('campaigns'),
  campaign: (id: string) => cabinetUrl(`campaigns/${id}`),
  stats: cabinetUrl('stats'),
  campaignStats: (id: string) => `${cabinetUrl('stats')}?campaign=${encodeURIComponent(id)}`,
  analytics: cabinetUrl('analytics'),
  profile: cabinetUrl('profile'),
  corporate: cabinetUrl('campaigns/corporate'),
  corporateFromWizard: `${cabinetUrl('campaigns/corporate')}?from=wizard`,
  campaignSent: (id: string) => cabinetUrl(`campaigns/${id}/sent`),
  campaignFix: (id: string) => cabinetUrl(`campaigns/${id}/fix`),
  campaignCopy: (id: string) => `${cabinetUrl('campaigns/new')}?copy=${encodeURIComponent(id)}`,
};
