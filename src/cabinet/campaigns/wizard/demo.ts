import { demoTariffTerms } from '../../demo';
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
  };
}
