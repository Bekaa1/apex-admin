// Plans as drawn in the design; codes and minimums match the backend `tariffs` table (the server checks them again).
// Names and texts live in `cabinet.tariffs.<code>`.

export type TariffCode = 'standard' | 'zones' | 'premium';
export type TariffFeature = 'allCarts' | 'zonePriority' | 'sound' | 'brandOnly';

export interface Tariff {
  code: TariffCode;
  /** Bars lit on the 4-bar level meter; the plan includes the first `level` features. */
  level: number;
  minimum: number;
  /** Shelf zones are chosen in the wizard (step 4). */
  hasZones: boolean;
}

/** Plans an advertiser picks in the wizard. */
export const TARIFFS: Tariff[] = [
  { code: 'standard', level: 1, minimum: 500_000, hasZones: false },
  { code: 'zones', level: 2, minimum: 1_000_000, hasZones: true },
  { code: 'premium', level: 3, minimum: 2_000_000, hasZones: true },
];

export const TARIFF_FEATURES: TariffFeature[] = ['allCarts', 'zonePriority', 'sound', 'brandOnly'];
export const TARIFF_LEVELS = [1, 2, 3, 4];
/** The corporate plan has every feature; its terms are agreed with a manager. */
export const CORPORATE_LEVEL = 4;
