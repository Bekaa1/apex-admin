import { shiftDate } from '../../../lib/dates';
import { demoTariffTerms } from '../../demo';
import { demoCampaignRow } from '../demo';
import { demoCatalog } from '../wizard/demo';
import type { CampaignDetailsSource, InvoiceRow, LocationRow } from './types';

// Dev-only fixtures for the campaign card and the top-up screen: /cabinet/campaigns/demo-lemonade?demo=active.
// Built on the rows of the list demo; nothing here reaches Supabase.

const TODAY = '2026-10-06';

const EXTRA: Record<string, { file: string; description: string; changedTerms?: boolean }> = {
  'demo-autumn': { file: 'autumn-sale.mp4', description: 'Скидки до 30% на соки и снеки с 15 октября по 15 ноября.' },
  'demo-baby': { file: 'baby-food.mp4', description: '' },
  'demo-coffee': { file: 'coffee-to-go.mp4', description: 'Кофе в дорогу: второй стакан в подарок.' },
  'demo-new-year': { file: 'new-year.mp4', description: 'Подарочные наборы и шампанское — скидки до 25%.' },
  'demo-snacks': { file: 'football-snacks-final.mp4', description: 'Чипсы и орешки к матчу: 2 пачки по цене одной по выходным.' },
  // Changed terms: the last invoice was at 10 ₸ a play and version 1, the plan is at 12 ₸ and version 2 now.
  'demo-milk': { file: 'dairy-week.mp4', description: 'Неделя молочных продуктов: кефир и творог со скидкой 20%.', changedTerms: true },
  'demo-tea': { file: 'autumn-tea.mp4', description: 'Чёрный и зелёный чай — второй пакет за полцены.' },
  'demo-lemonade': { file: 'summer-lemonade.mp4', description: 'Новый вкус «Тархун» — попробуйте со скидкой 15% до конца октября.' },
  'demo-festival': { file: 'summer-fest.mp4', description: 'Летний фестиваль вкусов: напитки, снеки и мороженое со скидкой.' },
};

function locations(storeCount: number, withZones: boolean): LocationRow[] {
  const catalog = demoCatalog();
  const stores = catalog.stores.slice(0, storeCount);
  return [
    ...stores.map((store): LocationRow => ({ kind: 'store', location_id: store.id, location_name: store.name, parent_store_id: null })),
    ...(withZones
      ? catalog.zones
          .filter((zone) => stores.some((store) => store.id === zone.storeId) && (zone.name === 'Напитки' || zone.name === 'Снеки'))
          .map((zone): LocationRow => ({ kind: 'zone', location_id: zone.id, location_name: zone.name, parent_store_id: zone.storeId }))
      : []),
  ];
}

export function demoDetailsSource(id: string): CampaignDetailsSource | null {
  const row = demoCampaignRow(id);
  const extra = EXTRA[id];
  if (!row || !extra) return null;
  const tariff = demoTariffTerms().find((plan) => plan.code === row.tariff_code);
  const start = row.start_date?.slice(0, 10) ?? null;
  const end = row.end_date?.slice(0, 10) ?? TODAY;
  const dailyPlays = [];
  if (start) {
    for (let day = start, i = 0; day <= end; day = shiftDate(day, 1), i += 1) {
      dailyPlays.push({ ad_id: id, play_date: day, plays: Math.round(1_200 + 380 * Math.sin(i / 2.3) + (i % 7) * 40) });
    }
  }
  const paidAt = start ? `${shiftDate(start, -1)}T10:00:00+05:00` : row.created_at;
  const invoices: InvoiceRow[] = row.budget
    ? [
        {
          id: `${id}-initial`,
          kind: 'initial',
          amount: row.budget,
          status: row.paid_amount ? 'paid' : 'unpaid',
          issued_at: row.created_at ?? TODAY,
          paid_at: row.paid_amount ? paidAt : null,
          sent_to: 'marketing@company.kz',
          tariff_version: 1,
          price_per_play: extra.changedTerms ? 10 : (tariff?.pricePerPlay ?? null),
        },
      ]
    : [];
  return {
    today: TODAY,
    campaign: {
      ...row,
      invoice_sent_to: 'marketing@company.kz',
      moderated_at: row.status === 'pending' ? null : (row.created_at ?? null),
      description: extra.description,
      video_url: null,
      video_duration_sec: 7,
      price_per_play: tariff?.pricePerPlay ?? null,
      plays_count: row.total_plays,
      tariff_version: extra.changedTerms ? 2 : 1,
      tariff_min_amount: tariff?.minimum ?? null,
      tariff_current_price: tariff?.pricePerPlay ?? null,
    },
    files: { video: extra.file, width: 1920, height: 1080, cover: null },
    locations: locations(row.store_count ?? 0, tariff?.hasZones ?? false),
    dailyPlays,
    invoices,
    tariffChangedAt: '2026-09-30T19:00:00Z',
  };
}
