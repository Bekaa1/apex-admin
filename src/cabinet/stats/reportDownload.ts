import type { ReportFilters } from './reportSelection';

export const REPORT_ISSUES = ['not_authenticated', 'forbidden', 'no_data', 'campaign_unavailable', 'too_large', 'data_changed', 'busy', 'rate_limited', 'not_configured', 'analysis_unavailable', 'report_unavailable'] as const;
export type ReportIssue = typeof REPORT_ISSUES[number];
export class ReportDownloadError extends Error {
  readonly issue: ReportIssue;
  constructor(issue: ReportIssue) { super(issue); this.issue = issue; }
}
/** Only filters are sent. The server obtains numbers with the caller's Apex JWT. */
export async function fetchReport(filters: ReportFilters, token: string, signal: AbortSignal, transport: typeof fetch = fetch): Promise<Blob> {
  let response: Response;
  try {
    response = await transport('/api/stats/report', { method: 'POST', signal, cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(filters) });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ReportDownloadError('report_unavailable');
  }
  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null);
    const code = result && typeof result === 'object' && 'error' in result ? result.error : null;
    throw new ReportDownloadError(REPORT_ISSUES.some(issue => issue === code) ? code as ReportIssue
      : response.status === 401 ? 'not_authenticated' : response.status === 403 ? 'forbidden' : 'report_unavailable');
  }
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/pdf')) throw new ReportDownloadError('report_unavailable');
  const pdf = await response.blob();
  if (pdf.size < 100 || pdf.size > 20_000_000 || await pdf.slice(0, 5).text() !== '%PDF-') throw new ReportDownloadError('report_unavailable');
  return pdf;
}

/** Synchronous lock covers a second click before React updates disabled state. */
export class ReportDownloadTask {
  private active: AbortController | null = null;
  cancel() { this.active?.abort(); }
  async run<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    if (this.active) return undefined;
    const controller = new AbortController(); this.active = controller;
    try { return await work(AbortSignal.any([controller.signal, AbortSignal.timeout(95_000)])); }
    finally { if (this.active === controller) this.active = null; }
  }
}
