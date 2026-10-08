import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { OverviewLoading } from '../overview/OverviewState';
import { InvoiceReadError } from './api';
import { InvoiceTable } from './InvoiceTable';
import { PAGE_SIZE, type InvoiceSelection } from './model';
import { useInvoices } from './useInvoices';
import styles from '../campaigns/CampaignsPage.module.css';

export function InvoiceResults({ selection, onPage, onReset }: { selection: InvoiceSelection; onPage: (page: number) => void; onReset: () => void }) {
  const { t, lang } = useI18n();
  const query = useInvoices(selection);
  if (selection.error) return <Alert tone="danger">{t(`adminInvoices.validation.${selection.error}`)}</Alert>;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const kind = query.error instanceof InvoiceReadError ? query.error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminInvoices.deniedTitle' : 'adminInvoices.errorTitle')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>{t(`adminInvoices.errors.${kind}`)}</Alert>;
  }
  const { rows, count, hasNext, profilesUnavailable, campaignsUnavailable } = query.data;
  const filtered = Object.values(selection.filters).some(value => value !== '');
  const empty = selection.page > 1 ? 'pageEmpty' : filtered ? 'noMatches' : 'empty';
  return <div className={styles.results} aria-busy={query.isFetching}>
    <div className={styles.actions}><p role="status">{count === null ? t('adminInvoices.countUnknown') : t('adminInvoices.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminInvoices.refresh')}</Button></div>
    {profilesUnavailable ? <Alert tone="info">{t('adminInvoices.profilesUnavailable')}</Alert> : null}
    {campaignsUnavailable ? <Alert tone="info">{t('adminInvoices.campaignsUnavailable')}</Alert> : null}
    {rows.length ? <InvoiceTable rows={rows} /> : <div className={styles.empty} role="status">
      <h2>{t(`adminInvoices.${empty}.title`)}</h2><p>{t(`adminInvoices.${empty}.body`)}</p>
      {selection.page > 1 ? <Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminInvoices.firstPage')}</Button>
        : filtered ? <Button size="md" variant="secondary" onClick={onReset}>{t('adminInvoices.reset')}</Button> : null}
    </div>}
    <nav className={styles.actions} aria-label={t('adminInvoices.pagination')}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminInvoices.previous')}</Button>
      <p>{t('adminInvoices.page', { page: selection.page, size: PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!hasNext || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminInvoices.next')}</Button>
    </nav>
  </div>;
}
