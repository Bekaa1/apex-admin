import type { Lang } from '../i18n/i18n';

// Browsers often ship without Kazakh number data and fall back to «₸1,000,000».
// Kazakhstan writes numbers like Russian («1 000 000 ₸»), so kk borrows the ru-RU number format.
const NUMBER_LOCALE: Record<Lang, string> = { kk: 'ru-RU', ru: 'ru-RU', en: 'en-US' };
const PLURAL_LOCALE: Record<Lang, string> = { kk: 'kk-KZ', ru: 'ru-RU', en: 'en-US' };
const LIST_AND: Record<Lang, string> = { kk: 'және', ru: 'и', en: 'and' };

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[lang]).format(value);
}

const COMPACT_UNITS = [
  { divisor: 1_000_000_000_000, ru: 'трлн', kk: 'трлн', en: 'T' },
  { divisor: 1_000_000_000, ru: 'млрд', kk: 'млрд', en: 'B' },
  { divisor: 1_000_000, ru: 'млн', kk: 'млн', en: 'M' },
  { divisor: 1_000, ru: 'тыс.', kk: 'мың', en: 'K' },
] as const;

const COMPACT_FORMATTERS: Record<Lang, Intl.NumberFormat> = {
  ru: new Intl.NumberFormat(NUMBER_LOCALE.ru, { maximumFractionDigits: 2 }),
  kk: new Intl.NumberFormat(NUMBER_LOCALE.kk, { maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat(NUMBER_LOCALE.en, { maximumFractionDigits: 2 }),
};

/** YouTube-style counters: 12_999 → «12,9 тыс.», 732_865 → «732 тыс.». */
export function formatCompactNumber(value: number, lang: Lang): string {
  if (!Number.isFinite(value)) return '—';
  const absolute = Math.abs(value);
  const unit = COMPACT_UNITS.find(({ divisor }) => absolute >= divisor);
  if (!unit) return formatNumber(value, lang);

  // Keep up to three significant digits and never round up into the next unit.
  const precision = absolute >= unit.divisor * 100 ? 1 : absolute >= unit.divisor * 10 ? 10 : 100;
  // Divide by an integer step before truncating to avoid floating-point boundary errors.
  const shortened = Math.trunc(value / (unit.divisor / precision)) / precision;
  return COMPACT_FORMATTERS[lang].format(shortened) + (lang === 'en' ? '' : '\u00a0') + unit[lang];
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

/** A play costs about 10 ₸, so tiyn are shown: «9,95 ₸». */
export function formatPrice(value: number, lang: Lang): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[lang], {
    style: 'currency',
    currency: 'KZT',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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

/** Message key for a count: `campaigns.list.count` and 3 → `campaigns.list.count.few` (ru). */
export function pluralKey(key: string, count: number, lang: Lang): string {
  return `${key}.${pluralCategory(count, lang)}`;
}

/** A shortened count uses «показов», even when its exact value ends in 1 or 2. */
export function compactPluralKey(key: string, count: number, lang: Lang): string {
  return pluralKey(key, Math.abs(count) >= 1_000 ? 1_000 : count, lang);
}

// Same reason as NUMBER_LOCALE: browsers often lack Kazakh month names.
const KK_MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];

/** «12 сент.» / «12 қыркүйек» / «Sep 12»: the calendar day in Almaty, where campaign dates are counted. */
export function formatDayMonth(value: string | Date, lang: Lang): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (lang === 'kk') {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'numeric' }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
    return `${part('day')} ${KK_MONTHS[part('month') - 1]}`;
  }
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'short' }).format(date);
}
