import { Alert, Button } from '../../design-system';
import { useSearchParams } from 'react-router';
import { useI18n } from '../../i18n/i18n';
import { CorporateFilters } from './CorporateFilters';
import { CorporateResults } from './CorporateResults';
import { corporateListParams, readCorporateSelection } from './listModel';
import styles from './CorporateRequestsPage.module.css';

export function CorporateRequestsPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const selection = readCorporateSelection(params);
  const signature = params.toString();
  const reset = () => setParams(corporateListParams(params, { search: '', status: '' }, 1));
  return <section className={styles.page} aria-labelledby="corporate-list-title">
    <div><Button href="/admin" variant="ghost" size="md" iconLeft="arrow-left">{t('adminCorporate.backOverview')}</Button></div>
    <header><h1 id="corporate-list-title">{t('adminCorporate.listTitle')}</h1><p className={styles.muted}>{t('adminCorporateList.description')}</p></header>
    <CorporateFilters key={'filters:' + signature} initial={selection.filters} onApply={(filters) => setParams(corporateListParams(params, filters, 1))} onReset={reset} />
    {selection.error ? <Alert tone="danger">{t(`adminCorporateList.validation.${selection.error}`)}</Alert> : null}
    <CorporateResults selection={selection} onPage={(page) => setParams(corporateListParams(params, selection.filters, page), { preventScrollReset: true })} onReset={reset} />
    <p className={styles.muted}>{t('adminCorporateList.scope')}</p>
  </section>;
}
