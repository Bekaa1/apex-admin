import { useSearchParams } from 'react-router';
import { Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { usePermissions } from '../../auth/usePermissions';
import { readSelection, selectionParams } from './model';
import { StoreFilters } from './StoreFilters';
import { StoreResults } from './StoreResults';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';

export function StoresPage() {
  const { t } = useI18n();
  const { can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const selection = readSelection(params);
  const reset = () => setParams(selectionParams(params, { search: '', city: '' }, 1));
  return <section className={styles.page} aria-labelledby="admin-stores-title">
    <header><h1 id="admin-stores-title">{t('adminStores.title')}</h1><p className={styles.muted}>{t('adminStores.description')}</p></header>
    {can('storeRequests') ? <div className={styles.actions}><Button href="/admin/stores/new" size="md" iconLeft="plus">{t('adminStoreRequest.title')}</Button>
      <Button href="/admin/store-requests" size="md" variant="secondary">{t('adminStoreRequests.title')}</Button></div> : null}
    <StoreFilters key={params.toString()} initial={selection.filters} onApply={filters => setParams(selectionParams(params, filters, 1))} onReset={reset} />
    <StoreResults selection={selection} onPage={page => setParams(selectionParams(params, selection.filters, page), { preventScrollReset: true })} onReset={reset} />
  </section>;
}
