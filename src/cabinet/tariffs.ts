import type { IconName } from '../design-system';

// Plans as drawn on their cards: the icon and the advantages listed with check marks. What a plan sells — the price of a
// play, the minimum, shelf zones and the terms version — comes from the backend `tariffs` table (useTariffTerms), because
// the business changes it without a release. Texts: `cabinet.tariffs.<code>` («zones» is «Бизнес», «corporate» — «Эксклюзив»).

export type TariffCode = 'standard' | 'zones' | 'premium';

export interface TariffLook {
  icon: IconName;
  /** Keys of `cabinet.tariffs.<code>.points`, in card order. */
  points: string[];
}

export interface Tariff extends TariffLook {
  code: TariffCode;
}

/** Plans an advertiser picks in the wizard. */
export const TARIFFS: Tariff[] = [
  { code: 'standard', icon: 'megaphone', points: ['carts', 'plays', 'rotation', 'stats'] },
  { code: 'zones', icon: 'chart', points: ['carts', 'plays', 'checkout', 'entrance', 'stats'] },
  { code: 'premium', icon: 'crown', points: ['carts', 'plays', 'topZones', 'zoneChoice', 'zoneStats', 'support'] },
];

/** «Эксклюзив»: not bought on the site, its terms are agreed with a manager. */
export const CORPORATE_TARIFF: TariffLook = { icon: 'gem', points: ['term', 'mediaplan', 'keyZones', 'category', 'reports', 'brands'] };

/** Marked with a star as the plan to start from. */
export const RECOMMENDED_TARIFF: TariffCode = 'premium';

/** A plan's current terms in `tariffs`: only plans that are on sale. */
export interface TariffTerms {
  code: TariffCode;
  /** Every play is paid at this price (₸); the invoice fixes it at the moment it is issued. */
  pricePerPlay: number;
  minimum: number;
  /** Shelf zones are chosen in the wizard (`can_select_zone`). */
  hasZones: boolean;
  /** The most plays a day the plan allows (`max_daily_plays`); null — no cap. */
  maxDailyPlays: number | null;
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
