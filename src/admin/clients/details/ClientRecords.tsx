import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber } from '../../../lib/format';
import { CampaignReadError } from '../../campaigns/api';
import { CampaignTable } from '../../campaigns/CampaignTable';
import { InvoiceReadError } from '../../invoices/api';
import { InvoiceTable } from '../../invoices/InvoiceTable';
import { OverviewLoading } from '../../overview/OverviewState';
import { clientsAccessConfigured } from '../access';
import { ClientReadError } from '../api';
import { CLIENT_PAGE_SIZE } from '../model';
import { useClientCampaigns, useClientInvoices } from './useClientDetail';
import type { ClientTab } from './model';
import styles from '../../campaigns/CampaignsPage.module.css';

type PageData<T> = { rows: T[]; count: number | null; hasNext: boolean };
interface RecordsProps<T> {
  query: UseQueryResult<PageData<T>, Error>;
  tab: ClientTab;
  page: number;
  onPage: (page: number) => void;
  children: (rows: T[]) => ReactNode;
  warnings: string[];
}

function ClientRecords<T>({ query, tab, page, onPage, children, warnings }: RecordsProps<T>) {
  const { t, lang } = useI18n();
  if (!clientsAccessConfigured()) return <Alert tone="warning">{t('adminClientDetail.unconfigured')}</Alert>;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const error = query.error;
    const kind = error instanceof ClientReadError || error instanceof CampaignReadError || error instanceof InvoiceReadError ? error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminClients.deniedTitle' : 'adminClientDetail.recordsError')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>
      {t(kind === 'unconfigured' ? 'adminClientDetail.unconfigured' : `adminClientDetail.errors.${kind}`)}
    </Alert>;
  }
  const { rows, count, hasNext } = query.data;
  return <div className={styles.results} aria-busy={query.isFetching}>
    <div className={styles.actions}>
      <p role="status">{count === null ? t('adminClients.countUnknown') : t('adminClients.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminClients.refresh')}</Button>
    </div>
    {warnings.map(key => <Alert key={key} tone="danger">{t(key)}</Alert>)}
    {rows.length ? children(rows) : <div className={styles.empty} role="status">
      <p>{t(page > 1 ? 'adminClients.pageEmpty.body' : `adminClientDetail.empty.${tab}`)}</p>
      {page > 1 ? <Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminClients.firstPage')}</Button> : null}
    </div>}
    <nav className={styles.actions} aria-label={t(`adminClientDetail.pagination.${tab}`)}>
      <Button size="md" variant="secondary" disabled={page <= 1 || query.isFetching} onClick={() => onPage(page - 1)}>{t('adminClients.previous')}</Button>
      <p>{t('adminClients.page', { page, size: CLIENT_PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!hasNext || query.isFetching} onClick={() => onPage(page + 1)}>{t('adminClients.next')}</Button>
    </nav>
  </div>;
}

type TabProps = { id: string; page: number; onPage: (page: number) => void };
export function ClientCampaigns({ id, page, onPage }: TabProps) {
  const query = useClientCampaigns(id, page);
  const warnings = [query.data?.profilesUnavailable ? 'adminCampaigns.profilesUnavailable' : '', query.data?.tariffsUnavailable ? 'adminCampaigns.tariffsUnavailable' : ''].filter(Boolean);
  return <ClientRecords query={query} tab="campaigns" page={page} onPage={onPage} warnings={warnings}>{rows => <CampaignTable rows={rows} />}</ClientRecords>;
}
export function ClientInvoices({ id, page, onPage }: TabProps) {
  const query = useClientInvoices(id, page);
  const warnings = [query.data?.profilesUnavailable ? 'adminInvoices.profilesUnavailable' : '', query.data?.campaignsUnavailable ? 'adminInvoices.campaignsUnavailable' : ''].filter(Boolean);
  return <ClientRecords query={query} tab="invoices" page={page} onPage={onPage} warnings={warnings}>{rows => <InvoiceTable rows={rows} />}</ClientRecords>;
}
