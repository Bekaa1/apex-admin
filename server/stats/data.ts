import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/database.types.ts';
import { readPricingConfig } from '../chat/pricing.ts';
import { todayInAlmaty } from '../../src/lib/dates.ts';
import { statsDateRanges, type ReportFilters } from '../../src/cabinet/stats/reportSelection.ts';
import { buildSnapshot, chooseCampaigns, parseCampaigns, parsePlays, ReportError } from './model.ts';

export interface ReportConfig { url: string; publicKey: string; openRouterKey: string; model: string }
export function readReportConfig(env: NodeJS.ProcessEnv): ReportConfig | null {
  const apex = readPricingConfig(env); // Only an Apex public key, never a privileged key.
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!apex || !key?.startsWith('sk-or-') || apex.url === env.CHAT_SUPABASE_URL?.trim()) return null;
  return { url: apex.url, publicKey: apex.key, openRouterKey: key,
    model: env.STATS_REPORT_MODEL?.trim() || env.OPENROUTER_MODEL?.trim() || 'google/gemini-2.5-flash-lite' };
}

export function userClient(config: ReportConfig, token: string, signal: AbortSignal, transport: typeof fetch = fetch) {
  return createClient<Database>(config.url, config.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => transport(input, { ...init,
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000), ...(init?.signal ? [init.signal] : [])]) }) },
  });
}
type Client = ReturnType<typeof userClient>;
export async function authorize(client: Client, token: string): Promise<string> {
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous) throw new ReportError('not_authenticated', 401);
  return data.user.id;
}
type Page = { data: unknown[] | null; error: { code?: string } | null; count: number | null; status: number };
async function all(fetchPage: (from: number, to: number) => PromiseLike<Page>, max: number): Promise<unknown[]> {
  const result: unknown[] = []; let expected: number | null = null;
  while (true) {
    const { data, error, count, status } = await fetchPage(result.length, result.length + 499);
    if (error) throw new ReportError(status === 401 ? 'not_authenticated' : status === 403 || error.code === '42501' ? 'forbidden' : 'data_unavailable', status === 401 ? 401 : status === 403 || error.code === '42501' ? 403 : 503);
    if (!Array.isArray(data) || count === null || !Number.isSafeInteger(count) || count < 0) throw new ReportError('invalid_data');
    if (count > max) throw new ReportError('too_large', 413);
    if (expected !== null && expected !== count) throw new ReportError('data_changed', 409);
    expected = count; result.push(...data);
    if (result.length === count) return result;
    if (!data.length || result.length > count) throw new ReportError('invalid_data');
  }
}
export async function readSnapshot(client: Client, filters: ReportFilters, signal: AbortSignal, now = new Date()) {
  const rows = parseCampaigns(await all((from, to) => {
    let query = client.from('my_campaigns_stats')
      .select('ad_id,title,name,status,start_date,end_date,spent_budget,price_per_play', { count: 'exact' });
    if (filters.campaignId) query = query.eq('ad_id', filters.campaignId);
    return query.order('ad_id').range(from, to).abortSignal(signal).retry(false);
  }, 5000));
  const chosen = chooseCampaigns(rows, filters);
  if (!chosen.length) throw new ReportError('no_data', 422);
  if (chosen.length > 200) throw new ReportError('too_large', 413);
  const dates = statsDateRanges(chosen, [], filters.period, todayInAlmaty(now));
  const plays = parsePlays(await all((from, to) => {
    let query = client.from('my_daily_plays_by_campaign').select('ad_id,play_date,plays', { count: 'exact' })
      .in('ad_id', chosen.map(row => row.ad_id)).lte('play_date', todayInAlmaty(now));
    if (filters.period !== 'all') query = query.gte('play_date', dates.compare!.from);
    return query.order('play_date').order('ad_id').range(from, to).abortSignal(signal).retry(false);
  }, 100_000));
  signal.throwIfAborted();
  return buildSnapshot(rows, plays, filters, now);
}
