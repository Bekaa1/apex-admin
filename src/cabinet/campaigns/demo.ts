import type { DemoVariant } from '../demo';
import { buildCampaignCards } from './model';
import type { CampaignStatsRow, CampaignsListState, CampaignsSource } from './types';

// Dev-only fixtures that reproduce the «Apex — Мои кампании» list. Kept free of top-level calls so production builds drop them.
// Payment, moderation, tariff and cart fields are not in the database yet; the fixtures show how they will look.

const TODAY = '2026-10-06';

type Row = Omit<CampaignStatsRow, 'title' | 'remaining_budget' | 'end_date' | 'start_date'> &
  Partial<Pick<CampaignStatsRow, 'remaining_budget' | 'start_date' | 'end_date'>>;

const ROWS: Row[] = [
  { ad_id: 'demo-autumn', name: 'Осенняя распродажа', status: 'pending', tariff_code: 'premium', store_count: 6, cart_count: 330, budget: 2_500_000, spent_budget: 0, paid_amount: 0, total_plays: 0, created_at: '2026-10-05T09:00:00Z' },
  { ad_id: 'demo-baby', name: 'Детское питание', status: 'pending', tariff_code: 'standard', store_count: 5, cart_count: 248, budget: 600_000, spent_budget: 0, paid_amount: 600_000, total_plays: 0, created_at: '2026-10-03T09:00:00Z' },
  {
    ad_id: 'demo-coffee', name: 'Кофе с собой', status: 'awaiting_payment', tariff_code: 'zones', store_count: 4, cart_count: 206, budget: 1_200_000, spent_budget: 0,
    paid_amount: 0, invoice_amount: 1_200_000, invoice_sent_to: 'marketing@company.kz', total_plays: 0, created_at: '2026-09-30T09:00:00Z',
  },
  {
    ad_id: 'demo-new-year', name: 'Новогодняя распродажа', status: 'rejected', tariff_code: 'premium', store_count: 10, cart_count: 488, budget: 3_000_000, spent_budget: 0,
    paid_amount: 3_000_000, rejection_reasons: ['languages_kk_ru'], moderator_comment: 'В конце ролика условия акции только на русском. Добавьте текст на казахском.',
    total_plays: 0, created_at: '2026-09-26T09:00:00Z',
  },
  { ad_id: 'demo-snacks', name: 'Снеки к футболу', status: 'active', tariff_code: 'standard', store_count: 8, cart_count: 410, budget: 800_000, spent_budget: 310_000, total_plays: 21_400, start_date: '2026-09-12T00:00:00+05:00', created_at: '2026-09-10T09:00:00Z' },
  { ad_id: 'demo-milk', name: 'Молочная неделя', status: 'budget_ended', tariff_code: 'zones', store_count: 3, cart_count: 150, budget: 500_000, spent_budget: 500_000, total_plays: 15_300, start_date: '2026-08-24T00:00:00+05:00', created_at: '2026-08-20T09:00:00Z' },
  { ad_id: 'demo-lemonade', name: 'Летний лимонад', status: 'active', tariff_code: 'zones', store_count: 6, cart_count: 312, budget: 1_000_000, spent_budget: 880_000, total_plays: 52_300, start_date: '2026-08-01T00:00:00+05:00', created_at: '2026-07-28T09:00:00Z' },
  {
    ad_id: 'demo-festival', name: 'Летний фестиваль', status: 'completed', tariff_code: 'premium', store_count: 12, cart_count: 590, budget: 2_000_000, spent_budget: 2_000_000,
    total_plays: 120_000, start_date: '2026-06-01T00:00:00+05:00', end_date: '2026-07-31T00:00:00+05:00', created_at: '2026-05-25T09:00:00Z',
  },
];

// 7 days: 8 580 + 1 120 + 9 840 = 19 540, as in the design; earlier days only count for 30 days.
const DAILY: Array<[string, string, number]> = [
  ['demo-snacks', '2026-10-06', 5_000], ['demo-snacks', '2026-10-03', 3_580], ['demo-snacks', '2026-09-20', 4_100],
  ['demo-milk', '2026-10-01', 1_120], ['demo-milk', '2026-09-15', 6_200],
  ['demo-lemonade', '2026-10-05', 5_200], ['demo-lemonade', '2026-10-02', 4_640], ['demo-lemonade', '2026-09-12', 8_800],
];

function demoSource(): CampaignsSource {
  return {
    today: TODAY,
    campaigns: ROWS.map((row) => ({ title: null, remaining_budget: null, start_date: null, end_date: null, ...row })),
    dailyPlays: DAILY.map(([ad_id, play_date, plays]) => ({ ad_id, play_date, plays })),
    ads: [],
    stores: [],
  };
}

export function demoCampaignsState(variant: DemoVariant): CampaignsListState {
  switch (variant) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', retry: () => window.location.assign('?demo=active') };
    case 'new':
      return { status: 'ready', cards: [] };
    case 'active':
      return { status: 'ready', cards: buildCampaignCards(demoSource()) };
  }
}
