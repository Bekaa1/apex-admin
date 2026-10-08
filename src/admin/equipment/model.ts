import { Constants } from '../../lib/database.types';
import { FILTER_LIMIT, isStoreId } from '../stores/model';
import { validPage, type DeviceTab } from '../stores/details/model';

export const CART_STATUSES = Constants.public.Enums.cart_status;
export interface EquipmentFilters { search: string; storeId: string; status: string; withoutZone: boolean }
export interface EquipmentSelection { tab: DeviceTab; filters: EquipmentFilters; page: number; error: boolean }
export const emptyFilters = (): EquipmentFilters => ({ search: '', storeId: '', status: '', withoutZone: false });
const key = (tab: DeviceTab, name: string) => `${tab}_${name}`;

export function validEquipmentFilters(tab: DeviceTab, filters: EquipmentFilters): boolean {
  return [filters.search, filters.status].every(value => typeof value === 'string' && value.length <= FILTER_LIMIT
    && !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))
    && (filters.storeId === '' || isStoreId(filters.storeId)) && typeof filters.withoutZone === 'boolean'
    && (tab === 'beacons' || !filters.withoutZone && (filters.status === '' || CART_STATUSES.some(value => value === filters.status)));
}
export function readEquipmentSelection(params: URLSearchParams): EquipmentSelection {
  const rawTab = params.get('tab') ?? 'carts';
  const tab = rawTab === 'beacons' ? 'beacons' : 'carts';
  const filters = { search: params.get(key(tab, 'search')) ?? '', storeId: params.get(key(tab, 'store')) ?? '',
    status: params.get(key(tab, 'status')) ?? '', withoutZone: tab === 'beacons' && params.get(key(tab, 'without_zone')) === '1' };
  const rawPage = params.get(key(tab, 'page')) ?? '1';
  const page = Number(rawPage);
  const filter = params.get(key(tab, 'without_zone'));
  const error = !['carts', 'beacons'].includes(rawTab) || params.getAll('tab').length > 1
    || !/^[1-9]\d*$/.test(rawPage) || !validPage(page) || !validEquipmentFilters(tab, filters)
    || (filter !== null && (tab !== 'beacons' || filter !== '1'))
    || ['search', 'store', 'status', 'without_zone', 'page'].some(name => params.getAll(key(tab, name)).length > 1);
  return { tab, filters, page: validPage(page) ? page : 1, error };
}
export function equipmentParams(previous: URLSearchParams, tab: DeviceTab, filters?: EquipmentFilters, page?: number): URLSearchParams {
  const params = new URLSearchParams(previous);
  params.set('tab', tab);
  if (filters) {
    for (const name of ['search', 'store', 'status', 'without_zone']) params.delete(key(tab, name));
    if (filters.search !== '') params.set(key(tab, 'search'), filters.search);
    if (filters.storeId !== '') params.set(key(tab, 'store'), filters.storeId.toLowerCase());
    if (filters.status !== '') params.set(key(tab, 'status'), filters.status);
    if (tab === 'beacons' && filters.withoutZone) params.set(key(tab, 'without_zone'), '1');
    params.set(key(tab, 'page'), String(page ?? 1));
  } else if (page !== undefined) params.set(key(tab, 'page'), String(page));
  return params;
}
