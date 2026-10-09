import { demoTariffTerms } from '../../demo';
import type { StorePlanSource } from './storePlan';
import type { CampaignForm, CatalogZone, MediaState, WizardApi, WizardCatalog } from './types';
import { emptyForm } from './reducer';

// Dev-only fixtures: the stores, zones and returned campaign drawn in «Apex — Мои кампании». Nothing here reaches Supabase.

const STORES: Array<[string, string, string, string, number, number, Array<[string, number]>]> = [
  ['s1', 'Береке Маркет', 'пр. Абая, 150', 'Алматы', 64, 3, [['Напитки', 2], ['Снеки', 1], ['Молочные продукты', 0], ['Бытовая химия', 3], ['Фрукты и овощи', 1], ['Кофе и чай', 4]]],
  ['s2', 'Береке Маркет', 'ул. Розыбакиева, 247', 'Алматы', 48, 5, [['Напитки', 1], ['Снеки', 2], ['Молочные продукты', 1], ['Бытовая химия', 0], ['Детские товары', 0]]],
  ['s3', 'Арай Фуд', 'ул. Жандосова, 58', 'Алматы', 36, 1, [['Напитки', 0], ['Снеки', 0], ['Кофе и чай', 1], ['Кондитерские изделия', 0]]],
  ['s4', 'Арай Фуд', 'ул. Тимирязева, 42', 'Алматы', 40, 2, [['Напитки', 1], ['Снеки', 1], ['Фрукты и овощи', 0]]],
  ['s5', 'Жұлдыз', 'ул. Сейфуллина, 534', 'Алматы', 52, 6, [['Напитки', 3], ['Снеки', 4], ['Бытовая химия', 1], ['Кофе и чай', 2]]],
  ['s6', 'Жұлдыз', 'ул. Толе би, 286', 'Алматы', 30, 11, [['Напитки', 2], ['Молочные продукты', 1]]],
  ['s7', 'Dala Market', 'пр. аль-Фараби, 77', 'Алматы', 72, 4, [['Напитки', 2], ['Снеки', 1], ['Молочные продукты', 1], ['Детские товары', 0], ['Кондитерские изделия', 1]]],
  ['s8', 'Береке Маркет', 'пр. Мангилик Ел, 37', 'Астана', 58, 2, [['Напитки', 0], ['Снеки', 1], ['Молочные продукты', 0], ['Бытовая химия', 1]]],
  ['s9', 'Арай Фуд', 'ул. Кенесары, 40', 'Астана', 34, 0, [['Напитки', 0], ['Снеки', 0], ['Кофе и чай', 0]]],
  ['s10', 'Dala Market', 'пр. Туран, 24', 'Астана', 46, 3, [['Напитки', 1], ['Снеки', 2], ['Молочные продукты', 0], ['Фрукты и овощи', 1]]],
];

export function demoCatalog(): WizardCatalog {
  return {
    stores: STORES.map(([id, name, address, city, carts, activeCampaigns]) => ({ id, name, address, city, carts, activeCampaigns })),
    zones: STORES.flatMap(([storeId, , , , , , zones]): CatalogZone[] =>
      zones.map(([name, otherBrands]) => ({ id: `${storeId}-${name}`, storeId, name, otherBrands })),
    ),
    tariffs: demoTariffTerms(),
  };
}

// A made-up hall, not a real store: fridges along the back wall, six shelf aisles, pallets, checkouts at the exit.
const HALL = { width: 2400, height: 1400 };
const FRIDGES = Array.from({ length: 9 }, (_, i) => ({ id: `R-${i + 1}`, kind: 'fridge', x: 120 + i * 240, y: 40, width: 200, height: 60, label: `R-${i + 1}` }));
const AISLES = 'ABCDEF'.split('').flatMap((aisle, column) =>
  [0, 1, 2].map((part) => ({ id: `${aisle}-${part + 1}`, kind: 'shelf', x: 220 + column * 300, y: 240 + part * 260, width: 60, height: 220, label: `${aisle}-${part + 1}` })),
);
const PALLETS = Array.from({ length: 4 }, (_, i) => ({ id: `P-${i + 1}`, kind: 'pallet', x: 2100 + (i % 2) * 140, y: 300 + Math.floor(i / 2) * 200, width: 120, height: 80, label: `P-${i + 1}` }));
const CHECKOUTS = Array.from({ length: 6 }, (_, i) => ({ id: `K-${i + 1}`, kind: 'checkout', x: 300 + i * 260, y: 1180, width: 160, height: 80, label: `K-${i + 1}` }));
const DEMO_ELEMENTS = [...FRIDGES, ...AISLES, ...PALLETS, ...CHECKOUTS, { id: 'IN-1', kind: 'entrance', x: 2080, y: 1320, width: 260, height: 60, label: 'Вход' }];
const DEMO_COLUMNS = [600, 1200, 1800].flatMap((x) => [{ type: 'column', x, y: 160, width: 40, height: 40 }, { type: 'column', x, y: 1040, width: 40, height: 40 }]);
const ZONE_SHELVES: Record<string, string[]> = {
  Напитки: ['R-1', 'R-2', 'R-3', 'R-4'],
  'Молочные продукты': ['R-5', 'R-6', 'R-7', 'R-8', 'R-9'],
  Снеки: ['A-1', 'A-2', 'A-3'],
  'Кофе и чай': ['B-1', 'B-2', 'B-3'],
  'Кондитерские изделия': ['C-1', 'C-2', 'C-3'],
  'Детские товары': ['D-1', 'D-2', 'D-3'],
  'Бытовая химия': ['E-1', 'E-2', 'E-3'],
  'Фрукты и овощи': ['P-1', 'P-2', 'P-3', 'P-4'],
};
// Arai Food on Zhandosova has no plan: the zones step shows chips only there.
const STORES_WITH_PLAN = ['s1', 's2', 's5', 's7', 's8', 's10'];

/** Floor plans of the demo stores; their zones light up the shelves listed in ZONE_SHELVES. */
export function demoStorePlans(storeIds: string[]): StorePlanSource[] {
  return STORES.filter(([id]) => STORES_WITH_PLAN.includes(id) && storeIds.includes(id)).map(([storeId, , , , , , zones]) => ({
    storeId,
    plan: { version: 1, ...HALL, elements: DEMO_ELEMENTS, decorations: DEMO_COLUMNS, metadata: {} },
    assignments: zones.flatMap(([name]) => (ZONE_SHELVES[name] ?? []).map((elementId) => ({ elementId, zoneId: `${storeId}-${name}` }))),
  }));
}

const DEMO_VIDEO: MediaState = { status: 'ready', url: '', fileName: 'new-year.mp4', meta: { sizeBytes: 18 * 1024 * 1024, durationSec: 7, width: 1920, height: 1080 } };

/** «Новогодняя распродажа», returned by the moderator: the fix flow of the design. */
export function demoReturnedForm(): CampaignForm {
  const storeIds = ['s1', 's2', 's3', 's5', 's7', 's8'];
  return {
    ...emptyForm(),
    name: 'Новогодняя распродажа',
    description: 'Скидки до 30% на подарочные наборы с 15 декабря по 7 января.',
    video: DEMO_VIDEO,
    tariff: 'premium',
    storeIds,
    zoneIds: storeIds.flatMap((storeId) => [`${storeId}-Напитки`, `${storeId}-Снеки`]),
    budget: 3_000_000,
  };
}

export const DEMO_MODERATION = { rules: ['languages_kk_ru'], comment: 'В конце ролика условия акции только на русском. Добавьте текст на казахском.' };

/** Uploads take a second and a half and stay in the browser; submitting succeeds without writing anything. */
export function demoWizardApi(): WizardApi {
  return {
    uploadMedia: (file, fileName, onProgress, signal) =>
      new Promise((resolve, reject) => {
        let pct = 0;
        const timer = window.setInterval(() => {
          pct = Math.min(pct + 8, 100);
          onProgress(pct);
          if (pct === 100) {
            window.clearInterval(timer);
            resolve({ url: URL.createObjectURL(file), fileName });
          }
        }, 120);
        signal.addEventListener('abort', () => {
          window.clearInterval(timer);
          reject(new DOMException('Upload cancelled.', 'AbortError'));
        });
      }),
    submit: () => new Promise((resolve) => window.setTimeout(() => resolve('demo-sent'), 600)),
    edit: (campaignId) => new Promise((resolve) => window.setTimeout(() => resolve(campaignId), 600)),
    storePlans: (storeIds) => new Promise((resolve) => window.setTimeout(() => resolve(demoStorePlans(storeIds)), 400)),
  };
}
