import type { ComponentType } from 'react';
import type { IconName } from '../design-system';

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
  subpages?: Array<{ path: string; titleKey: string; page?: () => Promise<ComponentType> }>;
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
    subpages: [
      { path: 'campaigns/new', titleKey: 'cabinet.createCampaign' },
      { path: 'campaigns/:campaignId', titleKey: 'cabinet.nav.campaigns' },
    ],
  },
  { id: 'stats', path: 'stats', labelKey: 'cabinet.nav.stats', icon: 'chart' },
  { id: 'analytics', path: 'analytics', labelKey: 'cabinet.nav.analytics', icon: 'pie-chart' },
  {
    id: 'profile',
    path: 'profile',
    labelKey: 'cabinet.nav.profile',
    icon: 'user',
    page: () => import('./profile/ProfilePage').then((m) => m.ProfilePage),
  },
];

export const CABINET_ROOT = '/cabinet';

/** Route `handle` of cabinet pages: the i18n key of the title in the top bar. */
export interface CabinetRouteHandle {
  titleKey: string;
}

export function routeTitleKey(handle: unknown): string | undefined {
  return typeof handle === 'object' && handle !== null && 'titleKey' in handle && typeof handle.titleKey === 'string' ? handle.titleKey : undefined;
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
};
