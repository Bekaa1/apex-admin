import type { Database } from '../../../lib/database.types';
import { isStoreId, PAGE_SIZE } from '../model';

type Tables = Database['public']['Tables'];
export type ZoneRow = Pick<Tables['zones']['Row'], 'id' | 'store_id' | 'name' | 'description'>;
export type CartRow = Pick<Tables['carts']['Row'], 'id' | 'store_id' | 'cart_number' | 'battery_level' | 'last_seen_at' | 'last_ping_at' | 'current_zone_id'> & {
  display_id: number | null;
  /** Preserve unknown/legacy server values as well as the five known enum values. */
  status: string | null;
};
export type BeaconRow = Pick<Tables['beacons']['Row'], 'id' | 'store_id' | 'box_number' | 'device_identifier' | 'status' | 'zone_id'>;
export type CartItem = CartRow & { zoneName: string | null };
export type BeaconItem = BeaconRow & { zoneName: string | null };
export interface RecordPage<T> { rows: T[]; count: number | null; hasNext: boolean; namesUnavailable: boolean }
export type StoreTab = 'zones' | 'carts' | 'beacons';
export type StoreRecords = { tab: 'zones'; data: RecordPage<ZoneRow> } | { tab: 'carts'; data: RecordPage<CartItem> } | { tab: 'beacons'; data: RecordPage<BeaconItem> };
export type DeviceTab = 'carts' | 'beacons';
export type DeviceRecords = Exclude<StoreRecords, { tab: 'zones' }>;
/** All stores must be requested explicitly. An invalid/missing store ID never widens scope. */
export type DeviceScope = { kind: 'store'; id: string } | { kind: 'all' };
export interface DeviceQuery { scope: DeviceScope; tab: DeviceTab; page: number; search: string; status: string; withoutZone: boolean }
export interface StoreTabSelection { tab: StoreTab; page: number; withoutZone: boolean; error: boolean }
const PAGE_KEYS = { zones: 'zones_page', carts: 'carts_page', beacons: 'beacons_page' } as const;

export function validPage(page: number): boolean {
  return Number.isSafeInteger(page) && page >= 1 && page <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE);
}
export function isStoreTab(value: unknown): value is StoreTab { return value === 'zones' || value === 'carts' || value === 'beacons'; }

export function readTabSelection(params: URLSearchParams): StoreTabSelection {
  const raw = params.get('tab') ?? 'zones';
  const tab = isStoreTab(raw) ? raw : 'zones';
  const key = PAGE_KEYS[tab];
  const pageValue = params.get(key) ?? '1';
  const page = Number(pageValue);
  const badPage = !/^[1-9]\d*$/.test(pageValue) || !validPage(page) || params.getAll(key).length > 1;
  const filter = params.get('without_zone');
  const badFilter = tab === 'beacons' && (filter !== null && filter !== '1' || params.getAll('without_zone').length > 1);
  return { tab, page: badPage ? 1 : page, withoutZone: tab === 'beacons' && filter === '1',
    error: !isStoreTab(raw) || params.getAll('tab').length > 1 || badPage || badFilter };
}
export function tabParams(previous: URLSearchParams, tab: StoreTab, page?: number): URLSearchParams {
  const params = new URLSearchParams(previous);
  params.set('tab', tab);
  if (page !== undefined) params.set(PAGE_KEYS[tab], String(page));
  return params;
}
export function beaconFilterParams(previous: URLSearchParams, checked: boolean): URLSearchParams {
  const params = tabParams(previous, 'beacons', 1);
  params.delete('without_zone');
  if (checked) params.set('without_zone', '1');
  return params;
}
export function resetTabParams(previous: URLSearchParams, tab: StoreTab): URLSearchParams {
  const params = tabParams(previous, tab, 1);
  if (tab === 'beacons') params.delete('without_zone');
  return params;
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
const text = (value: unknown) => value === null || typeof value === 'string';
const nullableId = (value: unknown) => value === null || isStoreId(value);

export function isZoneRow(value: unknown): value is ZoneRow {
  return record(value) && isStoreId(value.id) && nullableId(value.store_id) && typeof value.name === 'string' && text(value.description);
}
export function isCartRow(value: unknown): value is CartRow {
  return record(value) && isStoreId(value.id) && nullableId(value.store_id) && nullableId(value.current_zone_id)
    && ['cart_number', 'status', 'last_seen_at', 'last_ping_at'].every(key => text(value[key]))
    && (value.display_id === null || typeof value.display_id === 'number' && Number.isSafeInteger(value.display_id))
    && (value.battery_level === null || typeof value.battery_level === 'number' && Number.isFinite(value.battery_level));
}
export function isBeaconRow(value: unknown): value is BeaconRow {
  return record(value) && isStoreId(value.id) && nullableId(value.store_id) && nullableId(value.zone_id)
    && ['box_number', 'device_identifier', 'status'].every(key => text(value[key]));
}
