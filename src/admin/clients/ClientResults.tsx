import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { OverviewLoading } from '../overview/OverviewState';
import { clientsAccessConfigured } from './access';
import { ClientReadError } from './api';
import { ClientTable } from './ClientTable';
import { CLIENT_PAGE_SIZE, type ClientSelection } from './model';
import { useClients } from './useClients';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';

export function ClientResults({ selection, onPage, onReset }: { selection: ClientSelection; onPage: (page: number) => void; onReset: () => void }) {
  const { t, lang } = useI18n();
  const query = useClients(selection);
  // Never expose a partial/synthetic/cache result when administrative access is unconfirmed.
  if (!clientsAccessConfigured()) return <Alert tone="warning" title={t('adminClients.unconfigured.title')}>{t('adminClients.unconfigured.body')}</Alert>;
  if (selection.error) return <Alert tone="danger">{t(`adminClients.validation.${selection.error}`)}</Alert>;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const kind = query.error instanceof ClientReadError ? query.error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminClients.deniedTitle' : 'adminClients.errorTitle')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>{t(`adminClients.errors.${kind}`)}</Alert>;
  }
  const { rows, count, hasNext } = query.data;
  const filtered = selection.filters.search !== '' || selection.filters.displayId !== '';
  const empty = selection.page > 1 ? 'pageEmpty' : filtered ? 'noMatches' : 'empty';
  return <div className={styles.results} aria-busy={query.isFetching}>
    <div className={styles.actions}><p role="status">{count === null ? t('adminClients.countUnknown') : t('adminClients.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminClients.refresh')}</Button></div>
    {rows.length ? <ClientTable rows={rows} /> : <div className={styles.empty} role="status">
      <h2>{t(`adminClients.${empty}.title`)}</h2><p>{t(`adminClients.${empty}.body`)}</p>
      {selection.page > 1 ? <Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminClients.firstPage')}</Button>
        : filtered ? <Button size="md" variant="secondary" onClick={onReset}>{t('adminClients.reset')}</Button> : null}
    </div>}
    <nav className={styles.actions} aria-label={t('adminClients.pagination')}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminClients.previous')}</Button>
      <p>{t('adminClients.page', { page: selection.page, size: CLIENT_PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!hasNext || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminClients.next')}</Button>
    </nav>
  </div>;
}
