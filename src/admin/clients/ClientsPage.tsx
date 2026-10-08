import { useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/i18n';
import { clientsAccessConfigured } from './access';
import { ClientFilters } from './ClientFilters';
import { ClientResults } from './ClientResults';
import { clientParams, readClientSelection } from './model';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';

export function ClientsPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const selection = readClientSelection(params);
  const reset = () => setParams(clientParams(params, { search: '', displayId: '' }, 1));
  return <section className={styles.page} aria-labelledby="admin-clients-title">
    <header><h1 id="admin-clients-title">{t('adminClients.title')}</h1><p className={styles.muted}>{t('adminClients.description')}</p></header>
    <ClientFilters key={params.toString()} disabled={!clientsAccessConfigured()} initial={selection.filters} onApply={filters => setParams(clientParams(params, filters, 1))} onReset={reset} />
    <ClientResults selection={selection} onPage={page => setParams(clientParams(params, selection.filters, page), { preventScrollReset: true })} onReset={reset} />
  </section>;
}
