// Plans as drawn in the design: how they look (level bars, feature list). What a plan sells — the price of a play, the
// minimum, shelf zones and the terms version — comes from the backend `tariffs` table (useTariffTerms), because the business
// changes it without a release. Texts: `cabinet.tariffs.<code>`.

export type TariffCode = 'standard' | 'zones' | 'premium';
export type TariffFeature = 'allCarts' | 'zonePriority' | 'sound' | 'brandOnly';

export interface Tariff {
  code: TariffCode;
  /** Bars lit on the 4-bar level meter; the plan includes the first `level` features. */
  level: number;
}

/** Plans an advertiser picks in the wizard. */
export const TARIFFS: Tariff[] = [
  { code: 'standard', level: 1 },
  { code: 'zones', level: 2 },
  { code: 'premium', level: 3 },
];

/** A plan's current terms in `tariffs`: only plans that are on sale. */
export interface TariffTerms {
  code: TariffCode;
  /** Every play is paid at this price (₸); the invoice fixes it at the moment it is issued. */
  pricePerPlay: number;
  minimum: number;
  /** Shelf zones are chosen in the wizard (`can_select_zone`). */
  hasZones: boolean;
  /** Grows with every change of the terms; the site sends the version it showed (`tariff_changed` otherwise). */
  version: number;
}

/** Roughly how many plays an amount buys at a plan's price. */
export function playsFor(amount: number, pricePerPlay: number): number {
  return pricePerPlay > 0 ? Math.floor(amount / pricePerPlay) : 0;
}

/** The plan code a campaign row names, or `null` for an unknown one. */
export function tariffOf(code: string | null | undefined): TariffCode | 'corporate' | null {
  if (code === 'corporate') return code;
  return TARIFFS.find((tariff) => tariff.code === code)?.code ?? null;
}

export function termsOf(terms: TariffTerms[], code: TariffCode | null): TariffTerms | null {
  return terms.find((plan) => plan.code === code) ?? null;
}

export const TARIFF_FEATURES: TariffFeature[] = ['allCarts', 'zonePriority', 'sound', 'brandOnly'];
export const TARIFF_LEVELS = [1, 2, 3, 4];
/** The corporate plan has every feature; its terms are agreed with a manager. */
export const CORPORATE_LEVEL = 4;
