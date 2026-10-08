import { useLocation, useParams, useSearchParams } from 'react-router';
import { Alert, Button, Tabs } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { listReturnTo } from '../../../navigation/returnTo';
import { overviewDate } from '../../overview/model';
import { OverviewLoading } from '../../overview/OverviewState';
import { DetailField } from '../../campaigns/details/DetailState';
import { clientsAccessConfigured } from '../access';
import { ClientReadError } from '../api';
import { isClientId, type ClientRow } from '../model';
import { ClientCampaigns, ClientInvoices } from './ClientRecords';
import { clientTabParams, clientTabSelection } from './model';
import { useClientProfile } from './useClientDetail';
import styles from '../../campaigns/details/CampaignDetail.module.css';
import local from '../ClientsPage.module.css';

function ClientProfile({ row }: { row: ClientRow }) {
  const { t, lang } = useI18n();
  const unknown = t('adminClients.notSpecified');
  return <section className={styles.panel}>
    <h2>{t('adminClientDetail.profile')}</h2>
    <dl className={styles.fields}>
      <DetailField label={t('adminClients.columns.number')}>{row.display_id === null ? unknown : `№ ${row.display_id}`}</DetailField>
      <DetailField label={t('adminClients.columns.name')}>{row.full_name?.trim() || unknown}</DetailField>
      <DetailField label={t('adminClients.columns.company')}>{row.company_name?.trim() || unknown}</DetailField>
      <DetailField label={t('adminClients.columns.bin')}>{row.bin?.trim() || unknown}</DetailField>
      <DetailField label={t('adminClients.columns.email')}>{row.email?.trim() || unknown}</DetailField>
      <DetailField label={t('adminClients.columns.phone')}>{row.phone?.trim() || unknown}</DetailField>
      <DetailField label={t('adminClients.columns.created')}>{overviewDate(row.created_at, lang, unknown)}</DetailField>
    </dl>
    <p className={styles.muted}>{t('adminClientDetail.contacts')}</p>
  </section>;
}

function ClientContent({ id }: { id: string }) {
  const { t } = useI18n();
  const query = useClientProfile(id);
  const [params, setParams] = useSearchParams();
  const { state } = useLocation();
  const navigation = { preventScrollReset: true, state };
  const { tab, page, error } = clientTabSelection(params);
  if (!clientsAccessConfigured()) return <Alert tone="warning">{t('adminClientDetail.unconfigured')}</Alert>;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const kind = query.error instanceof ClientReadError ? query.error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminClients.deniedTitle' : 'adminClientDetail.errorTitle')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>
      {t(kind === 'unconfigured' ? 'adminClientDetail.unconfigured' : `adminClientDetail.errors.${kind}`)}
    </Alert>;
  }
  if (query.data === null) return <Alert title={t('adminClientDetail.notFound')}>{t('adminClientDetail.notFoundBody')}</Alert>;
  const onPage = (next: number) => setParams(clientTabParams(params, tab, next), navigation);
  return <div className={styles.blocks}>
    <ClientProfile row={query.data} />
    <section className={styles.panel} aria-label={t('adminClientDetail.records')}>
      <Tabs items={[{ value: 'campaigns', label: t('adminClientDetail.tabs.campaigns') }, { value: 'invoices', label: t('adminClientDetail.tabs.invoices') }]}
        value={tab} onChange={next => setParams(clientTabParams(params, next), navigation)} label={t('adminClientDetail.records')} panelId="client-records" />
      <div className={local.tabPanel} id="client-records" role="tabpanel" aria-label={t(`adminClientDetail.tabs.${tab}`)} tabIndex={0}>
        {error ? <Alert tone="warning" action={<Button size="md" variant="secondary" onClick={() => setParams(clientTabParams(params, tab, 1), navigation)}>{t('adminClients.firstPage')}</Button>}>{t('adminClientDetail.invalidPage')}</Alert>
          : tab === 'campaigns' ? <ClientCampaigns key={`${id}:campaigns`} id={id} page={page} onPage={onPage} />
            : <ClientInvoices key={`${id}:invoices`} id={id} page={page} onPage={onPage} />}
      </div>
    </section>
  </div>;
}

/** This route, including its unavailable state, lives inside the single RequireAdmin. */
export function ClientDetailPage() {
  const { id: raw } = useParams();
  const id = raw?.toLowerCase();
  const { state } = useLocation();
  const { t } = useI18n();
  return <section className={styles.page} aria-labelledby="client-detail-title">
    <div><Button href={listReturnTo(state, '/admin/clients')} variant="ghost" size="md" iconLeft="arrow-left">{t('adminClientDetail.back')}</Button></div>
    <header><h1 id="client-detail-title" tabIndex={-1}>{t('adminClientDetail.title')}</h1><p className={styles.muted}>{t('adminClientDetail.description')}</p></header>
    {!isClientId(id) ? <Alert tone="warning">{t('adminClientDetail.invalidId')}</Alert>
      : !clientsAccessConfigured() ? <Alert tone="warning">{t('adminClientDetail.unconfigured')}</Alert>
        : <ClientContent key={id} id={id} />}
  </section>;
}
