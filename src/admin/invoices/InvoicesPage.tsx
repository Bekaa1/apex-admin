import { useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/i18n';
import { InvoiceFilters } from './InvoiceFilters';
import { InvoiceResults } from './InvoiceResults';
import { readSelection, selectionParams } from './model';
import styles from '../campaigns/CampaignsPage.module.css';

export function InvoicesPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const selection = readSelection(params);
  const reset = () => setParams(selectionParams(params, { search: '', status: '', kind: '' }, 1));
  return <section className={styles.page} aria-labelledby="admin-invoices-title">
    <header><h1 id="admin-invoices-title">{t('adminInvoices.title')}</h1><p className={styles.muted}>{t('adminInvoices.description')}</p></header>
    <InvoiceFilters key={params.toString()} initial={selection.filters} onApply={filters => setParams(selectionParams(params, filters, 1))} onReset={reset} />
    <InvoiceResults selection={selection} onPage={page => setParams(selectionParams(params, selection.filters, page), { preventScrollReset: true })} onReset={reset} />
    <p className={styles.muted}>{t('adminInvoices.scope')}</p>
  </section>;
}
