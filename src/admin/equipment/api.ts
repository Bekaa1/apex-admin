import { requireSupabase } from '../../lib/supabase';
import { StoreReadError } from '../stores/api';
import { isStoreId, PAGE_SIZE } from '../stores/model';
import { fetchDeviceRecords } from '../stores/details/api';
import { validPage } from '../stores/details/model';
import { validEquipmentFilters, type EquipmentSelection } from './model';

async function storeNames(ids: string[], signal: AbortSignal) {
  const names: Record<string, string> = {};
  if (!ids.length) return { names, unavailable: false };
  try {
    // carts_store_id_fkey and beacons_store_id_fkey reference stores.id.
    const { data, error } = await requireSupabase().from('stores').select('id,name').in('id', ids).limit(PAGE_SIZE).abortSignal(signal);
    if (error || !Array.isArray(data)) return { names, unavailable: true };
    for (const row of data) {
      if (row && isStoreId(row.id) && ids.includes(row.id) && typeof row.name === 'string' && row.name.trim()) names[row.id] = row.name.trim();
    }
    return { names, unavailable: ids.some(id => !names[id]) };
  } catch { return { names, unavailable: true }; }
}

export async function fetchEquipment(selection: EquipmentSelection, signal: AbortSignal) {
  const { tab, page, filters } = selection;
  if (selection.error || !['carts', 'beacons'].includes(tab) || !validPage(page) || !validEquipmentFilters(tab, filters)) throw new StoreReadError('invalid');
  const records = await fetchDeviceRecords({ tab, page, search: filters.search, status: filters.status, withoutZone: filters.withoutZone,
    scope: filters.storeId === '' ? { kind: 'all' } : { kind: 'store', id: filters.storeId } }, signal);
  const stores = await storeNames([...new Set(records.data.rows.flatMap(row => row.store_id ? [row.store_id] : []))], signal);
  signal.throwIfAborted();
  return { records, stores: stores.names, storesUnavailable: stores.unavailable };
}
