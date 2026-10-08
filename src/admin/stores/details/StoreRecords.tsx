import { Alert, Button, Checkbox, Tabs } from '../../../design-system';
import { useLocation, useSearchParams } from 'react-router';
import { useI18n } from '../../../i18n/i18n';
import { usePermissions } from '../../../auth/usePermissions';
import { PermissionDenied } from '../../../auth/RequirePermission';
import { formatNumber } from '../../../lib/format';
import { OverviewLoading } from '../../overview/OverviewState';
import { PAGE_SIZE } from '../model';
import { beaconFilterParams, readTabSelection, resetTabParams, tabParams, type StoreTabSelection } from './model';
import { StoreFailure } from './StoreFailure';
import { BeaconTable, CartTable, ZoneTable } from './StoreRecordTables';
import { useStoreRecords } from './useStoreDetail';
import styles from '../../campaigns/details/CampaignDetail.module.css';
import local from './StoreDetail.module.css';

function RecordResults({ id, selection, onPage }: { id: string; selection: StoreTabSelection; onPage: (page: number) => void }) {
  const { t, lang } = useI18n();
  const query = useStoreRecords(id, selection);
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) return <StoreFailure error={query.error} pending={query.isFetching} onRetry={() => { void query.refetch(); }} />;
  const result = query.data;
  const { rows, count, hasNext, namesUnavailable } = result.data;
  return <div className={styles.blocks} aria-busy={query.isFetching}>
    <div className={styles.actions}>
      <p role="status">{count === null ? t('adminStores.countUnknown') : t('adminStores.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminStores.refresh')}</Button>
    </div>
    {namesUnavailable ? <Alert tone="info">{t('adminStoreDetail.zoneNamesUnavailable')}</Alert> : null}
    {rows.length ? result.tab === 'zones' ? <ZoneTable rows={result.data.rows} />
      : result.tab === 'carts' ? <CartTable rows={result.data.rows} /> : <BeaconTable rows={result.data.rows} />
      : <div className={styles.blocks} role="status">
        <p className={styles.empty}>{t(selection.page > 1 ? 'adminStores.pageEmpty.body' : selection.withoutZone ? 'adminStoreDetail.empty.withoutZone' : `adminStoreDetail.empty.${selection.tab}`)}</p>
        {selection.page > 1 ? <div><Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminStores.firstPage')}</Button></div> : null}
      </div>}
    <nav className={styles.actions} aria-label={t(`adminStoreDetail.pagination.${selection.tab}`)}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminStores.previous')}</Button>
      <p>{t('adminStores.page', { page: selection.page, size: PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!hasNext || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminStores.next')}</Button>
    </nav>
  </div>;
}

export function StoreRecords({ id, partner = false }: { id: string; partner?: boolean }) {
  const { t } = useI18n();
  const { can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const { state } = useLocation();
  const navigation = { state, preventScrollReset: true };
  const initial = new URLSearchParams(params);
  if (partner && !initial.has('tab')) initial.set('tab', 'carts');
  const selection = readTabSelection(initial);
  const tabs = partner ? ['carts'] as const : can('equipment') ? ['zones', 'carts', 'beacons'] as const : ['zones'] as const;
  const allowed = tabs.some(tab => tab === selection.tab);
  return <section className={styles.panel} aria-label={t('adminStoreDetail.records')}>
    <Tabs items={tabs.map(value => ({ value, label: t(`adminStoreDetail.tabs.${value}`) }))}
      value={selection.tab} onChange={tab => setParams(tabParams(params, tab), navigation)} label={t('adminStoreDetail.records')} panelId="store-records" />
    {allowed && selection.tab === 'beacons' ? <Checkbox checked={selection.withoutZone} onChange={event => setParams(beaconFilterParams(params, event.target.checked), navigation)}>{t('adminStoreDetail.withoutZone')}</Checkbox> : null}
    <div className={local.tabPanel} role="tabpanel" id="store-records" tabIndex={0} aria-label={t(`adminStoreDetail.tabs.${selection.tab}`)}>
      {!allowed ? <PermissionDenied /> : selection.error ? <Alert tone="warning" action={<Button size="md" variant="secondary" onClick={() => setParams(resetTabParams(params, selection.tab), navigation)}>{t('adminStoreDetail.resetTab')}</Button>}>{t('adminStoreDetail.invalidTab')}</Alert>
        : <RecordResults key={`${id}:${selection.tab}`} id={id} selection={selection} onPage={page => setParams(tabParams(params, selection.tab, page), navigation)} />}
    </div>
  </section>;
}
