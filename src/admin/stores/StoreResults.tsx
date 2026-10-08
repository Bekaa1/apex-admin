import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { OverviewLoading } from '../overview/OverviewState';
import { StoreReadError } from './api';
import { PAGE_SIZE, type StoreSelection } from './model';
import { StoreTable } from './StoreTable';
import { useStores } from './useStores';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';

export function StoreResults({ selection, onPage, onReset }: { selection: StoreSelection; onPage: (page: number) => void; onReset: () => void }) {
  const { t, lang } = useI18n();
  const query = useStores(selection);
  if (selection.error) return <Alert tone="danger">{t(`adminStores.validation.${selection.error}`)}</Alert>;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const kind = query.error instanceof StoreReadError ? query.error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminStores.deniedTitle' : 'adminStores.errorTitle')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>{t(`adminStores.errors.${kind}`)}</Alert>;
  }
  const { rows, count, hasNext, partnersUnavailable } = query.data;
  const filtered = selection.filters.search !== '' || selection.filters.city !== '';
  const empty = selection.page > 1 ? 'pageEmpty' : filtered ? 'noMatches' : 'empty';
  return <div className={styles.results} aria-busy={query.isFetching}>
    <div className={styles.actions}><p role="status">{count === null ? t('adminStores.countUnknown') : t('adminStores.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminStores.refresh')}</Button></div>
    {partnersUnavailable ? <Alert tone="info">{t('adminStores.partnersUnavailable')}</Alert> : null}
    {rows.length ? <StoreTable rows={rows} /> : <div className={styles.empty} role="status">
      <h2>{t(`adminStores.${empty}.title`)}</h2><p>{t(`adminStores.${empty}.body`)}</p>
      {selection.page > 1 ? <Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminStores.firstPage')}</Button>
        : filtered ? <Button size="md" variant="secondary" onClick={onReset}>{t('adminStores.reset')}</Button> : null}
    </div>}
    <nav className={styles.actions} aria-label={t('adminStores.pagination')}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminStores.previous')}</Button>
      <p>{t('adminStores.page', { page: selection.page, size: PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!hasNext || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminStores.next')}</Button>
    </nav>
  </div>;
}
