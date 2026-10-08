import { useSearchParams } from 'react-router';
import { Alert, Button, Select } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { readSelection, selectionParams, type BooleanFilter, type TariffFilters } from './model';
import { TariffResults } from './TariffResults';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';

export function TariffsPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const selection = readSelection(params);
  const navigation = { preventScrollReset: true };
  const reset = () => setParams(selectionParams(params, { archived: 'all', purchasable: 'all' }), navigation);
  const change = (name: keyof TariffFilters, value: BooleanFilter) => setParams(selectionParams(params, { ...selection.filters, [name]: value }), navigation);
  return <section className={styles.page} aria-labelledby="admin-tariffs-title">
    <header><h1 id="admin-tariffs-title">{t('adminTariffs.title')}</h1><p className={styles.muted}>{t('adminTariffs.description')}</p></header>
    <Alert tone="info">{t('adminTariffs.historyNote')}</Alert>
    <div className={styles.filters}>
      <Select label={t('adminTariffs.archiveFilter')} value={selection.filters.archived} options={[
        { value: 'false', label: t('adminTariffs.active') }, { value: 'true', label: t('adminTariffs.archived') }, { value: 'all', label: t('adminTariffs.all') },
      ]} onValueChange={value => change('archived', value)} />
      <Select label={t('adminTariffs.purchaseFilter')} value={selection.filters.purchasable} options={[
        { value: 'all', label: t('adminTariffs.all') }, { value: 'true', label: t('adminTariffs.purchase.yes') }, { value: 'false', label: t('adminTariffs.purchase.no') },
      ]} onValueChange={value => change('purchasable', value)} />
      <div className={styles.actions}><Button size="md" variant="ghost" onClick={reset}>{t('adminTariffs.showAll')}</Button></div>
    </div>
    <TariffResults selection={selection} onPage={page => setParams(selectionParams(params, selection.filters, page), navigation)} onReset={reset} />
  </section>;
}
