import { analyze } from './analysis.ts';
import { authorize, readSnapshot, userClient, type ReportConfig } from './data.ts';
import { parseFilters, ReportError } from './model.ts';
import { renderReport } from './pdf.ts';

/** No global user client, report cache or service-role reads. Each request carries its Apex JWT. */
export class StatsReports {
  private config: ReportConfig;
  private pending = new Set<string>();
  private rates = new Map<string, { count: number; until: number }>();
  private transport: typeof fetch;
  constructor(config: ReportConfig, transport: typeof fetch = fetch) { this.config = config; this.transport = transport; }

  async generate(token: string, input: unknown, signal: AbortSignal): Promise<{ pdf: Buffer; filename: string }> {
    const filters = parseFilters(input);
    const client = userClient(this.config, token, signal, this.transport);
    const userId = await authorize(client, token);
    if (this.pending.has(userId) || this.pending.size >= 2) throw new ReportError('busy', 429);
    const now = Date.now();
    for (const [id, rate] of this.rates) if (rate.until <= now) this.rates.delete(id);
    const rate = this.rates.get(userId) ?? { count: 0, until: now + 300_000 };
    if (rate.count >= 3 || !this.rates.has(userId) && this.rates.size >= 5000) throw new ReportError('rate_limited', 429);
    rate.count++; this.rates.set(userId, rate); this.pending.add(userId);
    try {
      const snapshot = await readSnapshot(client, filters, signal);
      const analysis = await analyze(this.config, snapshot, signal, this.transport);
      signal.throwIfAborted();
      const pdf = await renderReport(snapshot, analysis);
      signal.throwIfAborted();
      return { pdf, filename: `Apex-stats-${snapshot.range.from}-${snapshot.range.to}.pdf` };
    } finally { this.pending.delete(userId); }
  }
}
