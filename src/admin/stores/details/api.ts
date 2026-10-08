import { requireSupabase } from '../../../lib/supabase';
import { fetchStorePartners, responseError, STORE_COLUMNS, StoreReadError } from '../api';
import { isStoreId, isStoreRow, PAGE_SIZE, storeNamePattern, validFilters, type StoreRow } from '../model';
import { isBeaconRow, isCartRow, isStoreTab, isZoneRow, validPage, type BeaconRow, type DeviceQuery, type DeviceRecords, type RecordPage, type StoreRecords, type StoreTabSelection } from './model';

export async function fetchStoreRecord(id: string, signal: AbortSignal): Promise<StoreRow | null> {
  if (!isStoreId(id)) throw new StoreReadError('invalid');
  try {
    const { data, error, status } = await requireSupabase().from('stores').select(STORE_COLUMNS)
      .eq('id', id).abortSignal(signal).maybeSingle();
    responseError(error, status);
    signal.throwIfAborted();
    if (data === null) return null;
    if (!isStoreRow(data) || data.id.toLowerCase() !== id.toLowerCase()) throw new StoreReadError('invalid');
    return data;
  } catch (error) {
    if (error instanceof StoreReadError) throw error;
    throw new StoreReadError('unavailable');
  }
}

export async function fetchStorePartner(id: string, signal: AbortSignal) {
  if (!isStoreId(id)) throw new StoreReadError('invalid');
  const result = await fetchStorePartners([id], signal);
  signal.throwIfAborted();
  return { name: result.names.get(id) ?? null, unavailable: result.unavailable };
}

type ScopedRow = { id: string; store_id: string | null };
type PageResponse = { data: unknown; error: { code?: string } | null; status: number; count: number | null };
type ReadRange = (from: number, to: number, count: boolean) => PromiseLike<PageResponse>;

/** Main page and optional one-row probe share exactly the same scoped query factory. */
async function readPage<T extends ScopedRow>(id: string | null, page: number, request: ReadRange, validate: (row: unknown) => row is T): Promise<RecordPage<T>> {
  const offset = (page - 1) * PAGE_SIZE;
  const { data, error, status, count } = await request(offset, offset + PAGE_SIZE - 1, true);
  if (offset > 0 && status === 416 && error?.code === 'PGRST103') return { rows: [], count: null, hasNext: false, namesUnavailable: false };
  responseError(error, status);
  const inStore = (row: unknown): row is T => validate(row) && (id === null || row.store_id?.toLowerCase() === id.toLowerCase());
  if (!Array.isArray(data) || !data.every(inStore) || data.length > PAGE_SIZE || new Set(data.map(row => row.id)).size !== data.length
    || count !== null && (!Number.isSafeInteger(count) || count < 0 || data.length !== Math.min(PAGE_SIZE, Math.max(0, count - offset)))) throw new StoreReadError('invalid');
  let hasNext = count !== null && offset + data.length < count;
  if (count === null) {
    const next = await request(offset + data.length, offset + data.length, false);
    if (!(next.status === 416 && next.error?.code === 'PGRST103')) {
      responseError(next.error, next.status);
      if (!Array.isArray(next.data) || next.data.length > 1 || !next.data.every(inStore)) throw new StoreReadError('invalid');
      hasNext = next.data.length === 1;
    }
    if (data.length < PAGE_SIZE && hasNext) throw new StoreReadError('invalid');
  }
  return { rows: data, count, hasNext, namesUnavailable: false };
}

async function zoneNames(storeId: string | null, ids: string[], signal: AbortSignal) {
  const names = new Map<string, string>();
  if (!ids.length) return { names, unavailable: false };
  try {
    // Keep the card's store constraint in the lookup, too. Global lists still use only page IDs.
    let request = requireSupabase().from('zones').select('id,name,store_id').in('id', ids).limit(PAGE_SIZE);
    if (storeId !== null) request = request.eq('store_id', storeId);
    const { data, error } = await request.abortSignal(signal);
    if (error || !Array.isArray(data)) return { names, unavailable: true };
    for (const row of data) {
      if (!row || !isStoreId(row.id) || !ids.includes(row.id) || storeId !== null && row.store_id?.toLowerCase() !== storeId.toLowerCase()) continue;
      if (typeof row.name === 'string' && row.name.trim()) names.set(row.id, row.name.trim());
    }
    return { names, unavailable: ids.some(id => !names.has(id)) };
  } catch { return { names, unavailable: true }; }
}

/** The store card always imposes a validated store scope, regardless of URL filters. */
export async function fetchStoreRecords(id: string, selection: StoreTabSelection, signal: AbortSignal): Promise<StoreRecords> {
  const { tab, page, withoutZone } = selection;
  if (!isStoreId(id) || selection.error || !isStoreTab(tab) || !validPage(page) || typeof withoutZone !== 'boolean'
    || tab !== 'beacons' && withoutZone) throw new StoreReadError('invalid');
  try {
    const sb = requireSupabase();
    if (tab === 'zones') {
      const result = await readPage(id, page, (from, to, count) => sb.from('zones')
        .select('id,store_id,name,description', count ? { count: 'exact' } : undefined).eq('store_id', id)
        .order('name', { ascending: true, nullsFirst: false }).order('id', { ascending: true }).range(from, to).abortSignal(signal), isZoneRow);
      signal.throwIfAborted();
      return { tab, data: result };
    }
    return await fetchDeviceRecords({ scope: { kind: 'store', id }, tab, page, withoutZone, search: '', status: '' }, signal);
  } catch (error) {
    if (error instanceof StoreReadError) throw error;
    throw new StoreReadError('unavailable');
  }
}

/** Fixed fields/operators; escape both PostgreSQL regex and PostgREST's quoted OR value. */
export function beaconSearchFilter(search: string): string {
  const pattern = storeNamePattern(search);
  const quoted = '"' + pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  return `box_number.imatch.${quoted},device_identifier.imatch.${quoted}`;
}

/** Shared read-only equipment queries for the card and explicit all-store mode. */
export async function fetchDeviceRecords(query: DeviceQuery, signal: AbortSignal): Promise<DeviceRecords> {
  const { scope, tab, page, search, status: filterStatus, withoutZone } = query;
  if (!scope || (scope.kind !== 'all' && (scope.kind !== 'store' || !isStoreId(scope.id)))
    || (tab !== 'carts' && tab !== 'beacons') || !validPage(page)
    || !validFilters({ search, city: filterStatus }) || typeof withoutZone !== 'boolean'
    || tab !== 'beacons' && withoutZone) throw new StoreReadError('invalid');
  const id = scope.kind === 'store' ? scope.id : null;
  try {
    const sb = requireSupabase();
    if (tab === 'carts') {
      const result = await readPage(id, page, (from, to, count) => {
        let request = sb.from('carts').select('id,store_id,cart_number,display_id,status,battery_level,last_seen_at,last_ping_at,current_zone_id', count ? { count: 'exact' } : undefined);
        if (id !== null) request = request.eq('store_id', id);
        if (search !== '') request = request.filter('cart_number', 'imatch', storeNamePattern(search));
        if (filterStatus !== '') request = request.filter('status', 'eq', filterStatus);
        return request.order('cart_number', { ascending: true, nullsFirst: false }).order('id', { ascending: true }).range(from, to).abortSignal(signal);
      }, isCartRow);
      const zones = await zoneNames(id, [...new Set(result.rows.flatMap(row => row.current_zone_id ? [row.current_zone_id] : []))], signal);
      signal.throwIfAborted();
      return { tab, data: { ...result, namesUnavailable: zones.unavailable,
        rows: result.rows.map(row => ({ ...row, zoneName: row.current_zone_id ? zones.names.get(row.current_zone_id) ?? null : null })) } };
    }
    const result = await readPage(id, page, (from, to, count) => {
      let request = sb.from('beacons').select('id,store_id,box_number,device_identifier,status,zone_id', count ? { count: 'exact' } : undefined);
      if (id !== null) request = request.eq('store_id', id);
      if (search !== '') request = request.or(beaconSearchFilter(search));
      if (filterStatus !== '') request = request.eq('status', filterStatus);
      if (withoutZone) request = request.is('zone_id', null);
      return request.order('box_number', { ascending: true, nullsFirst: false }).order('id', { ascending: true }).range(from, to).abortSignal(signal);
    }, (row): row is BeaconRow => isBeaconRow(row) && (!withoutZone || row.zone_id === null));
    const zones = await zoneNames(id, [...new Set(result.rows.flatMap(row => row.zone_id ? [row.zone_id] : []))], signal);
    signal.throwIfAborted();
    return { tab, data: { ...result, namesUnavailable: zones.unavailable,
      rows: result.rows.map(row => ({ ...row, zoneName: row.zone_id ? zones.names.get(row.zone_id) ?? null : null })) } };
  } catch (error) {
    if (error instanceof StoreReadError) throw error;
    throw new StoreReadError('unavailable');
  }
}
