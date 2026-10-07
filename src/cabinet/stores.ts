import type { Tables } from '../lib/database.types';

/** Placeholder store the backend assigns to campaigns that run in every store. */
const ALL_STORES_NAME = 'Все магазины';

type StoreRef = Pick<Tables<'stores'>, 'id' | 'name'>;

/** Real stores behind campaign store ids; «Все магазины» stands for every real store. */
export function storesOf<S extends StoreRef>(storeIds: ReadonlyArray<string | null | undefined>, stores: S[]): S[] {
  const ids = new Set(storeIds);
  const real = stores.filter((s) => s.name !== ALL_STORES_NAME);
  const everywhere = stores.some((s) => s.name === ALL_STORES_NAME && ids.has(s.id));
  return everywhere ? real : real.filter((s) => ids.has(s.id));
}

type LocationRef = { kind: string | null; location_id: string | null; location_name: string | null };

/**
 * Real stores of campaign locations (`my_campaign_locations`). A store that left the catalog is still listed by the name
 * the campaign keeps, made by `missing`.
 */
export function linkedStores<S extends StoreRef>(locations: LocationRef[], catalog: S[], missing: (id: string, name: string) => S): S[] {
  const linked = locations.filter((location) => location.kind === 'store' && location.location_id);
  const known = [
    ...catalog,
    ...linked.flatMap((location) =>
      location.location_id && !catalog.some((store) => store.id === location.location_id) ? [missing(location.location_id, location.location_name ?? '')] : [],
    ),
  ];
  return storesOf(
    linked.map((location) => location.location_id),
    known,
  );
}
