import { requireSupabase } from '../../lib/supabase';
import { daysBetween, shiftDate } from '../../lib/dates';
import { almatyDayStart } from '../audit/model';
import { record, roleError, RoleApiError, textValue, uuid } from './api';

export function validRoutePeriod(from: string, to: string) {
  const valid = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
  return valid(from) && valid(to) && daysBetween(from, to) >= 1 && daysBetween(from, to) <= 31;
}
export async function readCartRoute(id: string, from: string, to: string, signal: AbortSignal) {
  if (!validRoutePeriod(from, to)) throw new RoleApiError('invalid');
  const { data, error } = await requireSupabase().rpc('cart_route', { p_cart_id: uuid(id), p_from: almatyDayStart(from), p_to: almatyDayStart(shiftDate(to, 1)) }).abortSignal(signal);
  if (error) throw roleError(error);
  if (!Array.isArray(data)) throw new RoleApiError('invalid');
  return data.map(value => {
    const row = record(value);
    return { zoneId: row.zone_id === null ? null : uuid(row.zone_id), name: textValue(row.zone_name), entered: textValue(row.entered_at), left: textValue(row.left_at),
      plays: typeof row.plays === 'number' && Number.isSafeInteger(row.plays) && row.plays >= 0 ? row.plays : null };
  });
}
