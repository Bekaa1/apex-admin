import { requireSupabase } from '../../lib/supabase';
import { isStoreRow } from '../stores/model';
import { STORE_COLUMNS } from '../stores/api';
import { record, roleError, RoleApiError, textValue, uuid } from '../roles/api';

export const PARTNER_PAGE_SIZE = 25;
export async function currentPartner(signal: AbortSignal): Promise<string | null> {
  const { data, error } = await requireSupabase().rpc('current_partner_id').abortSignal(signal);
  if (error) throw roleError(error);
  return data === null ? null : uuid(data);
}
export type PartnerSection = 'stores' | 'campaigns' | 'equipment';
export interface PartnerRow { key: string; id: string; name: string; city: string; status: string; storeId: string | null; storeName: string; battery: number | null; lastSeen: string; start: string; end: string }
export async function readPartnerPage(section: PartnerSection, page: number, signal: AbortSignal) {
  const sb = requireSupabase(), start = (page - 1) * PARTNER_PAGE_SIZE;
  const query = section === 'stores' ? sb.from('partner_stores').select('id,name,city').order('name').order('id')
    : section === 'campaigns' ? sb.from('partner_campaign_view').select('id,store_id,title,name,status,start_date,end_date').order('id').order('store_id')
      : sb.from('partner_devices').select('id,cart_number,status,battery_level,store_name,last_seen_label').order('cart_number').order('id');
  const { data, error } = await query.range(start, start + PARTNER_PAGE_SIZE).abortSignal(signal);
  if (error) throw roleError(error);
  if (!Array.isArray(data)) throw new RoleApiError('invalid');
  const rows = data.slice(0, PARTNER_PAGE_SIZE).map(value => {
    const row = record(value), id = uuid(row.id), storeId = row.store_id == null ? null : uuid(row.store_id);
    return { key: `${id}:${storeId ?? ''}`, id, name: textValue(row.cart_number ?? row.title ?? row.name), city: textValue(row.city),
      status: textValue(row.status), storeId, storeName: textValue(row.store_name), battery: typeof row.battery_level === 'number' && Number.isFinite(row.battery_level) ? row.battery_level : null,
      lastSeen: textValue(row.last_seen_label), start: textValue(row.start_date), end: textValue(row.end_date) } satisfies PartnerRow;
  });
  if (new Set(rows.map(row => row.key)).size !== rows.length) throw new RoleApiError('invalid');
  return { rows, hasNext: data.length > PARTNER_PAGE_SIZE };
}
/** Store catalogue is broadly readable; enforce the current network before mounting any equipment query. */
export async function readPartnerStore(id: string, partnerId: string, signal: AbortSignal) {
  const { data, error } = await requireSupabase().from('stores').select(STORE_COLUMNS)
    .eq('id', uuid(id)).eq('partner_id', uuid(partnerId)).abortSignal(signal).maybeSingle();
  if (error) throw roleError(error);
  if (data === null) return null;
  if (!isStoreRow(data) || data.id !== id || data.partner_id !== partnerId) throw new RoleApiError('invalid');
  return data;
}
