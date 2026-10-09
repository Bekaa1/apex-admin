import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { OverviewLoading } from '../overview/OverviewState';
import { StoreReadError } from '../stores/api';
import { PAGE_SIZE } from '../stores/model';
import { BeaconTable, CartTable } from '../stores/details/StoreRecordTables';
import { useEquipment } from './useEquipment';
import type { EquipmentSelection } from './model';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';

export function EquipmentResults({ selection, onPage, onReset }: { selection: EquipmentSelection; onPage: (page: number) => void; onReset: () => void }) {
  const { t, lang } = useI18n();
  const query = useEquipment(selection);
  if (selection.error) return <Alert tone="danger" action={<Button size="md" variant="secondary" onClick={onReset}>{t('adminStores.reset')}</Button>}>{t('adminEquipment.invalid')}</Alert>;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const kind = query.error instanceof StoreReadError ? query.error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminEquipment.denied' : 'adminEquipment.errorTitle')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>{t(`adminEquipment.errors.${kind}`)}</Alert>;
  }
  const { records, stores, storesUnavailable } = query.data;
  const { rows, count, hasNext, namesUnavailable } = records.data;
  const { search, storeId, status, withoutZone } = selection.filters;
  const filtered = Boolean(search || storeId || status || withoutZone);
  const empty = selection.page > 1 ? 'adminStores.pageEmpty' : filtered ? 'adminEquipment.noMatches' : 'adminEquipment.empty';
  return <div className={styles.results} aria-busy={query.isFetching}>
    <div className={styles.actions}><p role="status">{count === null ? t('adminStores.countUnknown') : t('adminStores.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminStores.refresh')}</Button></div>
    {storesUnavailable ? <Alert tone="danger">{t('adminEquipment.storesUnavailable')}</Alert> : null}
    {namesUnavailable ? <Alert tone="danger">{t('adminStoreDetail.zoneNamesUnavailable')}</Alert> : null}
    {rows.length ? records.tab === 'carts' ? <CartTable rows={records.data.rows} stores={stores} /> : <BeaconTable rows={records.data.rows} stores={stores} />
      : <div className={styles.empty} role="status"><h2>{t(`${empty}.title`)}</h2><p>{t(`${empty}.body`)}</p>
        {selection.page > 1 ? <Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminStores.firstPage')}</Button>
          : filtered ? <Button size="md" variant="secondary" onClick={onReset}>{t('adminStores.reset')}</Button> : null}</div>}
    <nav className={styles.actions} aria-label={t('adminEquipment.pagination')}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminStores.previous')}</Button>
      <p>{t('adminStores.page', { page: selection.page, size: PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!hasNext || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminStores.next')}</Button>
    </nav>
  </div>;
}
