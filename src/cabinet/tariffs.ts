// Plans as drawn in the design: what each one includes. Minimums and the terms version come from the backend
// `tariffs` table (useTariffTerms), because the business changes them without a release. Texts: `cabinet.tariffs.<code>`.

export type TariffCode = 'standard' | 'zones' | 'premium';
export type TariffFeature = 'allCarts' | 'zonePriority' | 'sound' | 'brandOnly';

export interface Tariff {
  code: TariffCode;
  /** Bars lit on the 4-bar level meter; the plan includes the first `level` features. */
  level: number;
  /** Shelf zones are chosen in the wizard (step 4). */
  hasZones: boolean;
}

/** Plans an advertiser picks in the wizard. */
export const TARIFFS: Tariff[] = [
  { code: 'standard', level: 1, hasZones: false },
  { code: 'zones', level: 2, hasZones: true },
  { code: 'premium', level: 3, hasZones: true },
];

/** A plan's current terms in `tariffs`: only plans that are on sale. */
export interface TariffTerms {
  code: TariffCode;
  minimum: number;
  /** Grows with every change of the terms; a new campaign sends the version it showed (`tariff_changed` otherwise). */
  version: number;
}

export function termsOf(terms: TariffTerms[], code: TariffCode | null): TariffTerms | null {
  return terms.find((plan) => plan.code === code) ?? null;
}

export const TARIFF_FEATURES: TariffFeature[] = ['allCarts', 'zonePriority', 'sound', 'brandOnly'];
export const TARIFF_LEVELS = [1, 2, 3, 4];
/** The corporate plan has every feature; its terms are agreed with a manager. */
export const CORPORATE_LEVEL = 4;
