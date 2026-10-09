import type { IncomingMessage, ServerResponse } from 'node:http';
import { ReportError } from './model.ts';
import type { StatsReports } from './service.ts';

/** Dedicated route; never forwards the anonymous Chat token or returns internal errors. */
export async function handleStatsReport(req: IncomingMessage, res: ServerResponse, reports: StatsReports | null, origins: Set<string>) {
  const controller = new AbortController();
  const closed = () => { if (!res.writableEnded) controller.abort(); };
  res.once('close', closed);
  try {
    if (req.method !== 'POST') throw new ReportError('method_not_allowed', 405);
    if (req.headers.origin && !origins.has(req.headers.origin)) throw new ReportError('forbidden', 403);
    const token = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.authorization ?? '')?.[1];
    if (!token || token.length > 8192) throw new ReportError('not_authenticated', 401);
    if (!reports) throw new ReportError('not_configured');
    if (!req.headers['content-type']?.startsWith('application/json')) throw new ReportError('invalid_request', 400);
    const parts: Buffer[] = []; let size = 0;
    for await (const part of req) {
      const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
      size += bytes.length; if (size > 2048) throw new ReportError('invalid_request', 413);
      parts.push(bytes);
    }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { throw new ReportError('invalid_request', 400); }
    const result = await reports.generate(token, input, AbortSignal.any([controller.signal, AbortSignal.timeout(90_000)]));
    if (res.destroyed) return;
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.pdf.length, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(result.pdf);
  } catch (error) {
    const safe = error instanceof ReportError ? error : new ReportError('report_unavailable');
    if (res.destroyed) return;
    res.writeHead(safe.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify({ error: safe.code }));
    if (safe.status >= 500) console.error(`[stats-report] ${safe.code}`);
  } finally { res.removeListener('close', closed); }
}
