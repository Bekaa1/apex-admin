import { allRows, requireSupabase } from '../../lib/supabase';

export interface PublicStore {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  cart_count: number | null;
  zone_count: number | null;
}

/** Existing catalog permissions apply. Only venue fields are requested, never advertiser statistics. */
export async function fetchPublicStores(signal: AbortSignal): Promise<PublicStore[]> {
  const sb = requireSupabase();
  return allRows((from, to) => sb.rpc('catalog_stores', undefined, { count: 'exact' })
    .select('id,name,address,city,cart_count,zone_count').order('name').order('id').range(from, to).abortSignal(signal));
}

export async function fetchStoreZones(storeId: string, signal: AbortSignal) {
  const { data, error } = await requireSupabase().rpc('catalog_zones', { p_store_ids: [storeId] })
    .select('id,name').order('name').abortSignal(signal);
  if (error) throw error;
  return data;
}
