import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { OverviewLoading } from '../overview/OverviewState';
import { TariffReadError } from './api';
import { PAGE_SIZE, type TariffSelection } from './model';
import { TariffTable } from './TariffTable';
import { useTariffs } from './useTariffs';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';

export function TariffResults({ selection, onPage, onReset }: { selection: TariffSelection; onPage: (page: number) => void; onReset: () => void }) {
  const { t, lang } = useI18n();
  const query = useTariffs(selection);
  if (selection.error) return <Alert tone="danger" action={<Button size="md" variant="secondary" onClick={onReset}>{t('adminTariffs.showAll')}</Button>}>{t('adminTariffs.invalid')}</Alert>;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const kind = query.error instanceof TariffReadError ? query.error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminTariffs.denied' : 'adminTariffs.errorTitle')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>{t(`adminTariffs.errors.${kind}`)}</Alert>;
  }
  const { rows, count, hasNext } = query.data;
  const filtered = selection.filters.archived !== 'all' || selection.filters.purchasable !== 'all';
  const empty = selection.page > 1 ? 'adminStores.pageEmpty' : filtered ? 'adminTariffs.noMatches' : 'adminTariffs.empty';
  return <div className={styles.results} aria-busy={query.isFetching}>
    <div className={styles.actions}><p role="status">{count === null ? t('adminStores.countUnknown') : t('adminStores.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminStores.refresh')}</Button></div>
    {rows.length ? <TariffTable rows={rows} /> : <div className={styles.empty} role="status">
      <h2>{t(`${empty}.title`)}</h2><p>{t(`${empty}.body`)}</p>
      {selection.page > 1 ? <Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminStores.firstPage')}</Button>
        : filtered ? <Button size="md" variant="secondary" onClick={onReset}>{t('adminTariffs.showAll')}</Button> : null}
    </div>}
    <nav className={styles.actions} aria-label={t('adminTariffs.pagination')}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminStores.previous')}</Button>
      <p>{t('adminStores.page', { page: selection.page, size: PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!hasNext || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminStores.next')}</Button>
    </nav>
  </div>;
}
