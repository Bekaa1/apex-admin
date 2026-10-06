import type { Lang } from '../i18n/i18n';

// Browsers often ship without Kazakh number data and fall back to «₸1,000,000».
// Kazakhstan writes numbers like Russian («1 000 000 ₸»), so kk borrows the ru-RU number format.
const NUMBER_LOCALE: Record<Lang, string> = { kk: 'ru-RU', ru: 'ru-RU', en: 'en-US' };
const PLURAL_LOCALE: Record<Lang, string> = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' };
const LIST_AND: Record<Lang, string> = { kk: 'және', ru: 'и', en: 'and' };

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[lang]).format(value);
}

/** «12 500 ₸» in ru/kk, «₸12,500» in en. */
export function formatMoney(value: number, lang: Lang): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[lang], {
    style: 'currency',
    currency: 'KZT',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** `fraction` 0.12 → «+12 %». */
export function formatDelta(fraction: number, lang: Lang): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[lang], { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 0 }).format(fraction);
}

/** «Алматы и Астана» / «Алматы және Астана» / «Almaty and Astana». */
export function formatList(items: string[], lang: Lang): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${LIST_AND[lang]} ${items[items.length - 1]}`;
}

/** Plural category for message keys like `activeOf.one` / `activeOf.many`. */
export function pluralCategory(count: number, lang: Lang): Intl.LDMLPluralRule {
  return new Intl.PluralRules(PLURAL_LOCALE[lang]).select(count);
}
