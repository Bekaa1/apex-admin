import { requireSupabase } from '../../../lib/supabase';
import { CampaignReadError, type CampaignErrorKind } from '../api';
import { isCampaignId, PAGE_SIZE } from '../model';
import { isAdvertiser, isCampaignDetail, isInvoice, isPortion, nullableText, record, type Advertiser, type CampaignDetail, type Invoice, type Placement, type PlacementKind, type Portion, type RelatedPage, type Tariff } from './model';

function responseError(error: { code?: string } | null, status: number) {
  if (!error) return;
  throw new CampaignReadError(status === 401 || status === 403 || error.code === '42501' ? 'denied'
    : ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? '') ? 'missing' : 'unavailable');
}
async function read<T>(id: string, signal: AbortSignal, request: () => Promise<T>): Promise<T> {
  if (!isCampaignId(id)) throw new CampaignReadError('invalid');
  try { const result = await request(); signal.throwIfAborted(); return result; }
  catch (error) { if (error instanceof CampaignReadError) throw error; throw new CampaignReadError('unavailable'); }
}
function offsetFor(page: number): number {
  if (!Number.isSafeInteger(page) || page < 1 || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE)) throw new CampaignReadError('invalid');
  return (page - 1) * PAGE_SIZE;
}
function checkedPage<T extends { id: string; ad_id: string | null }>(data: unknown, count: number | null, id: string, offset: number, valid: (row: unknown) => row is T): RelatedPage<T> {
  if (!Array.isArray(data) || !data.every(valid) || data.some((row) => row.ad_id !== id)
    || count === null || !Number.isSafeInteger(count) || count < 0
    || data.length !== Math.min(PAGE_SIZE, Math.max(0, count - offset)) || new Set(data.map((row) => row.id)).size !== data.length) throw new CampaignReadError('invalid');
  return { rows: data, count };
}

export function fetchCampaignDetail(id: string, signal: AbortSignal): Promise<CampaignDetail | null> {
  return read(id, signal, async () => {
    const { data, error, status } = await requireSupabase().from('ads').select('id,display_id,title,name,description,user_id,status,tariff_id,budget,paid_amount,spent_budget,created_at,submitted_at,start_date,end_date,video_url,content_url,video_original_filename,cover_original_filename,video_duration_sec,video_width,video_height,video_size_bytes,rejection_reasons,moderator_comment,moderated_at,moderated_by').eq('id', id).abortSignal(signal).maybeSingle();
    responseError(error, status);
    if (data === null) return null;
    if (!isCampaignDetail(data) || data.id !== id) throw new CampaignReadError('invalid');
    return data;
  });
}
export function fetchAdvertiser(id: string, signal: AbortSignal): Promise<Advertiser | null> {
  return read(id, signal, async () => {
    // Same explicit users.id lookup as the administrative list. No invented FK join.
    const { data, error, status } = await requireSupabase().from('users').select('id,full_name,display_name,company_name').eq('id', id).abortSignal(signal).maybeSingle();
    responseError(error, status);
    if (data === null) return null; // UI treats a hidden/missing profile as unavailable, not absent.
    if (!isAdvertiser(data) || data.id !== id) throw new CampaignReadError('invalid');
    return data;
  });
}
export function fetchTariff(id: string, signal: AbortSignal): Promise<Tariff | null> {
  return read(id, signal, async () => {
    const { data, error, status } = await requireSupabase().from('tariffs').select('id,name,code').eq('id', id).abortSignal(signal).maybeSingle();
    responseError(error, status);
    if (data === null) return null;
    if (!record(data) || data.id !== id || typeof data.name !== 'string' || !nullableText(data.code)) throw new CampaignReadError('invalid');
    return data;
  });
}
export function fetchInvoices(id: string, page: number, signal: AbortSignal): Promise<RelatedPage<Invoice>> {
  return read(id, signal, async () => {
    const offset = offsetFor(page);
    const { data, error, status, count } = await requireSupabase().from('advertiser_invoices')
      .select('id,ad_id,number,amount,status,issued_at,paid_at', { count: 'exact' }).eq('ad_id', id)
      .order('issued_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
    if (status === 416 && error?.code === 'PGRST103' && offset > 0) return { rows: [], count: null };
    responseError(error, status);
    return checkedPage(data, count, id, offset, isInvoice);
  });
}
export function fetchPortions(id: string, page: number, signal: AbortSignal): Promise<RelatedPage<Portion>> {
  return read(id, signal, async () => {
    const offset = offsetFor(page);
    const { data, error, status, count } = await requireSupabase().from('ad_budget_portions')
      .select('id,ad_id,invoice_id,amount,spent,price_per_play,position', { count: 'exact' }).eq('ad_id', id)
      .order('position', { ascending: true, nullsFirst: false }).order('id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
    if (status === 416 && error?.code === 'PGRST103' && offset > 0) return { rows: [], count: null };
    responseError(error, status);
    return checkedPage(data, count, id, offset, isPortion);
  });
}

type PlacementPage = RelatedPage<Placement> & { namesError: CampaignErrorKind | null };
export function fetchPlacement(id: string, kind: PlacementKind, page: number, signal: AbortSignal): Promise<PlacementPage> {
  return read(id, signal, async () => {
    const offset = offsetFor(page);
    // Both ad_id and target FKs are present in database.types.ts. Names are optional reads.
    const result = kind === 'stores'
      ? await requireSupabase().from('ad_stores').select('id,ad_id,store_id', { count: 'exact' }).eq('ad_id', id).order('id').range(offset, offset + PAGE_SIZE - 1).abortSignal(signal)
      : await requireSupabase().from('ad_zones').select('id,ad_id,zone_id', { count: 'exact' }).eq('ad_id', id).order('id').range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
    if (result.status === 416 && result.error?.code === 'PGRST103' && offset > 0) return { rows: [], count: null, namesError: null };
    responseError(result.error, result.status);
    if (!Array.isArray(result.data)) throw new CampaignReadError('invalid');
    const targetKey = kind === 'stores' ? 'store_id' : 'zone_id';
    const normalized = result.data.map((value: unknown) => {
      if (!record(value)) throw new CampaignReadError('invalid');
      return { id: value.id, ad_id: value.ad_id, targetId: value[targetKey], name: null };
    });
    const base = checkedPage<Placement>(normalized, result.count, id, offset, (row): row is Placement => record(row) && isCampaignId(row.id) && row.ad_id === id && (row.targetId === null || isCampaignId(row.targetId)) && row.name === null);
    const ids = [...new Set(base.rows.flatMap((row) => row.targetId ? [row.targetId] : []))];
    if (!ids.length) return { ...base, namesError: null };
    try {
      const names = await requireSupabase().from(kind).select('id,name').in('id', ids).limit(PAGE_SIZE).abortSignal(signal);
      responseError(names.error, names.status);
      if (!Array.isArray(names.data) || !names.data.every((row) => ids.includes(row.id) && typeof row.name === 'string')) throw new CampaignReadError('invalid');
      const byId = new Map(names.data.map((row) => [row.id, row.name]));
      return { rows: base.rows.map((row) => ({ ...row, name: row.targetId ? byId.get(row.targetId) ?? null : null })), count: base.count, namesError: ids.some((key) => !byId.has(key)) ? 'unavailable' : null };
    } catch (error) {
      signal.throwIfAborted();
      return { ...base, namesError: error instanceof CampaignReadError ? error.kind : 'unavailable' };
    }
  });
}
