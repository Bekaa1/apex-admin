import type { DemoVariant } from '../demo';
import { buildHomeData } from './model';
import type { HomeSource, HomeState, StoreRow } from './types';

// Dev-only fixtures that reproduce the «Apex — Кабинет» artboards. Kept free of top-level calls so production builds drop them.

const TODAY = '2026-10-06';
const EMPTY: HomeSource = { today: TODAY, campaigns: [], dailyPlays: [], extras: [], stores: [] };

const CITIES = ['Алматы', 'Алматы', 'Алматы', 'Алматы', 'Алматы', 'Алматы', 'Алматы', 'Алматы', 'Алматы', 'Алматы', 'Астана', 'Астана', 'Астана', 'Астана'];

function demoStores(): StoreRow[] {
  return [{ id: 'demo-all', name: 'Все магазины', city: null }, ...CITIES.map((city, i) => ({ id: `demo-store-${i}`, name: `Супермаркет ${i + 1}`, city }))];
}

const ACTIVE: Omit<HomeSource, 'stores'> = {
  today: TODAY,
  campaigns: [
    { ad_id: 'demo-ad-1', title: 'Летний лимонад', name: null, status: 'active', budget: 1_000_000, spent_budget: 880_000, remaining_budget: 120_000, total_plays: 52_300, created_at: '2026-09-20' },
    { ad_id: 'demo-ad-2', title: 'Снеки к футболу', name: null, status: 'active', budget: 800_000, spent_budget: 310_000, remaining_budget: 490_000, total_plays: 21_400, created_at: '2026-09-28' },
    { ad_id: 'demo-ad-3', title: 'Осенняя распродажа', name: null, status: 'pending', budget: 2_000_000, spent_budget: 0, remaining_budget: 2_000_000, total_plays: 0, created_at: '2026-10-05' },
  ],
  // This week 9 840 + 8 580 = 18 420, the week before 16 446 → +12 %.
  dailyPlays: [
    { ad_id: 'demo-ad-1', play_date: '2026-10-06', plays: 5_200 },
    { ad_id: 'demo-ad-1', play_date: '2026-10-03', plays: 4_640 },
    { ad_id: 'demo-ad-2', play_date: '2026-10-05', plays: 8_580 },
    { ad_id: 'demo-ad-1', play_date: '2026-09-28', plays: 8_800 },
    { ad_id: 'demo-ad-2', play_date: '2026-09-25', plays: 7_646 },
  ],
  extras: [
    { id: 'demo-ad-1', content_url: null, video_url: null, store_id: 'demo-all', tariff: 'Стандарт + Зоны' },
    { id: 'demo-ad-2', content_url: null, video_url: null, store_id: 'demo-all', tariff: 'Стандарт' },
    { id: 'demo-ad-3', content_url: null, video_url: null, store_id: 'demo-store-0', tariff: 'Премиум' },
  ],
};

export function demoHomeState(variant: DemoVariant): HomeState {
  switch (variant) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', retry: () => window.location.assign('?demo=active') };
    case 'new':
      return { status: 'ready', data: buildHomeData(EMPTY) };
    case 'active':
      return { status: 'ready', data: buildHomeData({ ...ACTIVE, stores: demoStores() }) };
  }
}
