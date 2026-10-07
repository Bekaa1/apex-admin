import type { Tables } from '../lib/database.types';

/** Placeholder store the backend assigns to campaigns that run in every store. */
export const ALL_STORES_NAME = 'Все магазины';
/** Placeholder zone of campaigns that play in every zone. */
export const ALL_ZONES_NAME = 'Все зоны';

type StoreRef = Pick<Tables<'stores'>, 'id' | 'name'>;

/** Real stores behind campaign store ids; «Все магазины» stands for every real store. */
export function storesOf<S extends StoreRef>(storeIds: ReadonlyArray<string | null | undefined>, stores: S[]): S[] {
  const ids = new Set(storeIds);
  const real = stores.filter((s) => s.name !== ALL_STORES_NAME);
  const everywhere = stores.some((s) => s.name === ALL_STORES_NAME && ids.has(s.id));
  return everywhere ? real : real.filter((s) => ids.has(s.id));
}
