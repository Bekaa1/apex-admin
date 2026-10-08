type PricingConfig = { url: string; key: string };
const labels: Record<string, string> = { standard: 'Стандарт', zones: 'Стандарт + Зоны', premium: 'Премиум' };
const unavailable = 'ТЕКУЩИЕ ТАРИФЫ: сейчас не получены. Не называй числовые цены и минимумы по памяти. Объясни форматы и дай https://apexmedia.kz/pricing.';

export function readPricingConfig(env: NodeJS.ProcessEnv): PricingConfig | null {
  const url = env.APEX_PUBLIC_SUPABASE_URL?.trim();
  const key = env.APEX_PUBLIC_SUPABASE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.username || parsed.password) return null;
    // Public catalog only. Never reuse the Chat server key or an Apex privileged key.
    if (!key.startsWith('sb_publishable_')) {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      if (payload.role !== 'anon') return null;
    }
  } catch { return null; }
  return { url, key };
}

/** Same public tariffs source/filters as PricingPage; no profiles or administrative data. */
export class PublicPricing {
  private readonly config: PricingConfig | null;
  private cached: { text: string; until: number } | null = null;
  private loading: Promise<string> | null = null;
  constructor(config: PricingConfig | null) { this.config = config; }

  get(): Promise<string> {
    if (!this.config) return Promise.resolve(unavailable);
    if (this.cached && this.cached.until > Date.now()) return Promise.resolve(this.cached.text);
    if (this.loading) return this.loading;
    const work = this.load(); this.loading = work;
    void work.finally(() => { this.loading = null; });
    return work;
  }

  private async load(): Promise<string> {
    try {
      const config = this.config!;
      const url = new URL('/rest/v1/tariffs', config.url);
      url.search = new URLSearchParams({ select: 'code,price_per_play,min_amount,can_select_zone,version',
        purchasable: 'eq.true', is_archived: 'eq.false', code: 'in.(standard,zones,premium)', limit: '20' }).toString();
      const headers: Record<string, string> = { apikey: config.key };
      if (!config.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${config.key}`;
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error();
      const rows: unknown = await response.json();
      if (!Array.isArray(rows)) throw new Error();
      const tariffs = rows.map((row: Record<string, unknown>) => {
        if (!row || typeof row.code !== 'string' || !Object.hasOwn(labels, row.code)
          || typeof row.price_per_play !== 'number' || !Number.isFinite(row.price_per_play) || row.price_per_play < 0
          || typeof row.min_amount !== 'number' || !Number.isFinite(row.min_amount) || row.min_amount < 0
          || typeof row.can_select_zone !== 'boolean' || !Number.isInteger(row.version)) throw new Error();
        return { name: labels[row.code], pricePerPlayKzt: row.price_per_play, minimumBudgetKzt: row.min_amount,
          canSelectZones: row.can_select_zone, version: row.version };
      });
      if (new Set(tariffs.map(row => row.name)).size !== tariffs.length) throw new Error();
      const text = 'ТЕКУЩИЕ ТАРИФЫ. Публичные условия сайта; кэш не более 5 минут. Минимум не является месячной ценой. '
        + 'Индивидуальные договоры имеют приоритет. Отсутствующие в этом ответе тарифы не объявляй доступными к покупке.\n'
        + JSON.stringify({ source: 'https://apexmedia.kz/pricing', checkedAt: new Date().toISOString(), currency: 'KZT', tariffs });
      this.cached = { text, until: Date.now() + 300_000 }; return text;
    } catch {
      this.cached = { text: unavailable, until: Date.now() + 30_000 }; return unavailable;
    }
  }
}
