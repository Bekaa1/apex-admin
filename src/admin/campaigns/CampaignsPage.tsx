import { useSearchParams } from 'react-router';
import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { OverviewLoading } from '../overview/OverviewState';
import { CampaignReadError } from './api';
import { CampaignFilters } from './CampaignFilters';
import { CampaignTable } from './CampaignTable';
import { PAGE_SIZE, readSelection, selectionParams, type CampaignMode, type CampaignSelection } from './model';
import { useCampaigns } from './useCampaigns';
import styles from './CampaignsPage.module.css';

function CampaignResults({ selection, mode, onPage, onReset }: { selection: CampaignSelection; mode: CampaignMode; onPage: (page: number) => void; onReset: () => void }) {
  const { t, lang } = useI18n();
  const query = useCampaigns(selection, mode);
  if (selection.error) return <Alert tone="danger">{t(`adminCampaigns.validation.${selection.error}`)}</Alert>;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const kind = query.error instanceof CampaignReadError ? query.error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminCampaigns.deniedTitle' : 'adminCampaigns.errorTitle')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>{t(`adminCampaigns.errors.${kind}`)}</Alert>;
  }
  const { rows, count, hasNext, profilesUnavailable, tariffsUnavailable } = query.data;
  const empty = selection.page > 1 ? 'pageEmpty' : selection.filters.search !== '' || mode !== 'moderation' && selection.filters.status !== '' ? 'noMatches' : 'empty';
  return <div className={styles.results} aria-busy={query.isFetching}>
    <div className={styles.actions}><p role="status">{count === null ? t('adminCampaigns.countUnknown') : t('adminCampaigns.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminCampaigns.refresh')}</Button></div>
    {profilesUnavailable ? <Alert tone="danger">{t('adminCampaigns.profilesUnavailable')}</Alert> : null}
    {tariffsUnavailable ? <Alert tone="danger">{t('adminCampaigns.tariffsUnavailable')}</Alert> : null}
    {rows.length ? <CampaignTable rows={rows} /> : <div className={styles.empty} role="status">
      <h2>{t(mode === 'moderation' && empty === 'empty' ? 'adminModeration.empty' : `adminCampaigns.${empty}.title`)}</h2><p>{t(`adminCampaigns.${empty}.body`)}</p>
      {selection.page > 1 ? <Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminCampaigns.firstPage')}</Button>
        : empty === 'noMatches' ? <Button size="md" variant="secondary" onClick={onReset}>{t('adminCampaigns.reset')}</Button> : null}
    </div>}
    <nav className={styles.actions} aria-label={t('adminCampaigns.pagination')}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminCampaigns.previous')}</Button>
      <p>{t('adminCampaigns.page', { page: selection.page, size: PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!hasNext || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminCampaigns.next')}</Button>
    </nav>
  </div>;
}

export function CampaignsPage({ mode = 'all' }: { mode?: CampaignMode }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const selection = readSelection(params, mode);
  const reset = () => setParams(selectionParams(params, { search: '', status: mode === 'moderation' ? 'pending' : '' }, 1));
  return <section className={styles.page} aria-labelledby="admin-campaigns-title">
    <header><h1 id="admin-campaigns-title">{t(mode === 'moderation' ? 'adminModeration.title' : 'adminCampaigns.title')}</h1><p className={styles.muted}>{t(mode === 'moderation' ? 'adminModeration.description' : 'adminCampaigns.description')}</p></header>
    <CampaignFilters key={`${mode}:${params.toString()}`} fixedStatus={mode === 'moderation'} initial={selection.filters} onApply={(filters) => setParams(selectionParams(params, filters, 1))} onReset={reset} />
    <CampaignResults selection={selection} mode={mode} onPage={(page) => setParams(selectionParams(params, selection.filters, page), { preventScrollReset: true })} onReset={reset} />
    <p className={styles.muted}>{t('adminCampaigns.scope')}</p>
  </section>;
}

export function ModerationPage() { return <CampaignsPage mode="moderation" />; }
