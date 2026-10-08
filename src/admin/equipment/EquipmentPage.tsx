import { useSearchParams } from 'react-router';
import { Alert, Tabs } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { emptyFilters, equipmentParams, readEquipmentSelection } from './model';
import { EquipmentFilters } from './EquipmentFilters';
import { EquipmentResults } from './EquipmentResults';
import shared from '../corporate-requests/CorporateRequestsPage.module.css';
import styles from './EquipmentPage.module.css';

/** Mounted only after the existing RequireAdmin succeeds. No prefetch of inactive tabs. */
export function EquipmentPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const selection = readEquipmentSelection(params);
  const navigation = { preventScrollReset: true };
  const reset = () => setParams(equipmentParams(params, selection.tab, emptyFilters()), navigation);
  return <section className={shared.page} aria-labelledby="equipment-title">
    <header><h1 id="equipment-title">{t('adminEquipment.title')}</h1><p className={shared.muted}>{t('adminEquipment.description')}</p></header>
    <Alert tone="info" title={t('adminStoreDetail.dataSource')}>{t('adminStoreDetail.syncUnknown')}</Alert>
    <Tabs items={(['carts', 'beacons'] as const).map(value => ({ value, label: t(`adminStoreDetail.tabs.${value}`) }))}
      label={t('adminEquipment.tabs')} value={selection.tab} onChange={tab => setParams(equipmentParams(params, tab), navigation)} panelId="equipment-records" />
    <div id="equipment-records" className={styles.panel} role="tabpanel" tabIndex={0} aria-label={t(`adminStoreDetail.tabs.${selection.tab}`)}>
      <EquipmentFilters key={params.toString()} tab={selection.tab} initial={selection.filters} onApply={filters => setParams(equipmentParams(params, selection.tab, filters), navigation)} onReset={reset} />
      <EquipmentResults selection={selection} onPage={page => setParams(equipmentParams(params, selection.tab, undefined, page), navigation)} onReset={reset} />
    </div>
  </section>;
}
