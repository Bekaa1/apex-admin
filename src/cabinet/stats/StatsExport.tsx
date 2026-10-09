import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from '../../design-system';
import { useAuthSession } from '../../auth/useAuthSession';
import { useI18n } from '../../i18n/i18n';
import { requireSupabase } from '../../lib/supabase';
import type { ReportFilters } from './reportSelection';
import { fetchReport, ReportDownloadError, ReportDownloadTask, type ReportIssue } from './reportDownload';

export function StatsExport({ filters, enabled, demo }: { filters: ReportFilters; enabled: boolean; demo: boolean }) {
  const { t } = useI18n();
  const { session } = useAuthSession();
  const userId = session?.user.id;
  // Parent keys this component by user, language and filters. Old downloads are aborted on changes.
  const task = useRef(new ReportDownloadTask());
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<ReportIssue | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const current = task.current; mounted.current = true;
    return () => { mounted.current = false; current.cancel(); };
  }, []);
  const download = () => {
    if (!enabled || demo || !userId) return;
    void task.current.run(async signal => {
      setBusy(true); setIssue(null); setSaved(false);
      try {
        const sb = requireSupabase();
        const { data, error } = await sb.auth.getSession();
        if (error || data.session?.user.id !== userId || !data.session.access_token) throw new ReportDownloadError('not_authenticated');
        const pdf = await fetchReport(filters, data.session.access_token, signal);
        const current = await sb.auth.getSession();
        signal.throwIfAborted();
        if (current.error || current.data.session?.user.id !== userId) throw new ReportDownloadError('not_authenticated');
        if (!mounted.current) return;
        const url = URL.createObjectURL(pdf);
        const link = document.createElement('a');
        link.href = url; link.download = `Apex-stats-${filters.period}-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSaved(true);
      } catch (error) {
        if (mounted.current) setIssue(error instanceof ReportDownloadError ? error.issue : 'report_unavailable');
      } finally { if (mounted.current) setBusy(false); }
    });
  };
  return <section className="st-export" aria-label={t('statsExport.title')}>
    <div className="st-export__action">
      <Button size="md" loading={busy} disabled={!enabled || demo || !userId} onClick={download} aria-describedby="stats-export-note">
        {t(busy ? 'statsExport.generating' : 'statsExport.download')}
      </Button>
      <p id="stats-export-note" className="cab-note">{t(demo ? 'statsExport.demo' : !enabled ? 'statsExport.noData' : 'statsExport.note')}</p>
    </div>
    {busy ? <p role="status" className="cab-note">{t('statsExport.wait')}</p> : null}
    {issue ? <Alert tone="danger" title={t('statsExport.failed')} action={<Button size="md" variant="secondary" onClick={download} disabled={busy || !enabled}>{t('statsExport.retry')}</Button>}>{t(`statsExport.errors.${issue}`)}</Alert> : null}
    {saved ? <p role="status" className="cab-note">{t('statsExport.saved')}</p> : null}
  </section>;
}
