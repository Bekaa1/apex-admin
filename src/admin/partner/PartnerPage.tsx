import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { Alert, Badge, Button } from '../../design-system';
import { useAuthSession } from '../../auth/useAuthSession';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { overviewDate } from '../overview/model';
import { isStoreId } from '../stores/model';
import { StoreFields } from '../stores/details/StoreFields';
import { StoreRecords } from '../stores/details/StoreRecords';
import { roleError } from '../roles/api';
import { adminStatusTone } from '../statusTone';
import { currentPartner, readPartnerPage, readPartnerStore, type PartnerSection } from './api';
import styles from '../roles/Roles.module.css';

function NetworkGate({ children }: { children: (partnerId: string) => ReactNode }) {
  const { t } = useI18n(), { session } = useAuthSession();
  const query = useQuery({ queryKey: ['admin', 'partner', session?.user.id, 'identity'], queryFn: ({ signal }) => currentPartner(signal), retry: false, gcTime: 0 });
  if (query.isPending) return <p role="status">{t('roles.loading')}</p>;
  if (query.isError) return <Alert tone="danger" action={<Button size="md" onClick={() => { void query.refetch(); }}>{t('roles.retry')}</Button>}>{t(`roles.errors.${roleError(query.error).kind}`)}</Alert>;
  if (!query.data) return <Alert>{t('roles.noNetwork')}</Alert>;
  return children(query.data);
}
function PartnerList({ section, partnerId }: { section: PartnerSection; partnerId: string }) {
  const { t, lang } = useI18n(), { session } = useAuthSession();
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('page') ?? 1), page = Number.isSafeInteger(raw) && raw > 0 && raw <= 100_000 ? raw : 1;
  const query = useQuery({ queryKey: ['admin', 'partner', session?.user.id, partnerId, section, page], queryFn: ({ signal }) => readPartnerPage(section, page, signal), retry: false, gcTime: 0 });
  const title = t(section === 'stores' ? 'roles.myStores' : section === 'campaigns' ? 'roles.storeCampaigns' : 'roles.storeEquipment');
  const unknown = t('roles.notSpecified');
  return <section className={styles.page}><header className={styles.form}><h1>{title}</h1><p className={styles.muted}>{t('roles.networkScope')}</p></header>
    {section === 'equipment' ? <Alert>{t('adminStoreDetail.dataSource')} {t('adminStoreDetail.syncUnknown')}</Alert> : null}
    <div><Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('roles.refresh')}</Button></div>
    {query.isPending ? <p role="status">{t('roles.loading')}</p> : query.isError ? <Alert tone="danger">{t(`roles.errors.${roleError(query.error).kind}`)}</Alert>
      : !query.data.rows.length ? <p>{t('roles.empty')}</p> : <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={title}><table className={styles.table}>
        <thead><tr><th scope="col">{t('roles.name')}</th>
          {section === 'stores' ? <th scope="col">{t('roles.city')}</th> : <><th scope="col">{t('roles.store')}</th><th scope="col">{t('roles.status')}</th>
            {section === 'equipment' ? <><th scope="col">{t('roles.battery')}</th><th scope="col">{t('roles.lastSeen')}</th><th scope="col">{t('roles.route')}</th></> : <><th scope="col">{t('roles.start')}</th><th scope="col">{t('roles.end')}</th></>}</>}
        </tr></thead>
        <tbody>{query.data.rows.map(row => <tr key={row.key}><td>{section === 'stores' ? <Link to={`/admin/partner/stores/${row.id}`}>{row.name || unknown}</Link> : row.name || row.id}</td>
          {section === 'stores' ? <td>{row.city || unknown}</td> : <><td>{row.storeId ? <Link to={`/admin/partner/stores/${row.storeId}`}>{row.storeName || row.storeId}</Link> : row.storeName || unknown}</td><td><Badge tone={adminStatusTone(section === 'equipment' ? 'equipment' : 'campaign', row.status)}>{row.status || unknown}</Badge></td>
            {section === 'equipment' ? <><td>{row.battery === null ? unknown : `${formatNumber(row.battery, lang)}%`}</td><td>{row.lastSeen || unknown}</td><td><Link to={`/admin/cart-routes/${row.id}`}>{t('roles.route')}</Link></td></>
              : <><td>{overviewDate(row.start, lang, unknown)}</td><td>{overviewDate(row.end, lang, unknown)}</td></>}</>}
        </tr>)}</tbody></table></div>}
    <div className={styles.actions}><Button size="md" variant="secondary" disabled={page <= 1 || query.isFetching} onClick={() => setParams({ page: String(page - 1) })}>{t('roles.previous')}</Button><span>{t('roles.page', { page })}</span><Button size="md" variant="secondary" disabled={!query.data?.hasNext || query.isFetching} onClick={() => setParams({ page: String(page + 1) })}>{t('roles.next')}</Button></div>
  </section>;
}
export function PartnerStoresPage() { return <NetworkGate>{id => <PartnerList key={id} partnerId={id} section="stores" />}</NetworkGate>; }
export function PartnerCampaignsPage() { return <NetworkGate>{id => <PartnerList key={id} partnerId={id} section="campaigns" />}</NetworkGate>; }
export function PartnerEquipmentPage() { return <NetworkGate>{id => <PartnerList key={id} partnerId={id} section="equipment" />}</NetworkGate>; }
function PartnerStore({ id, partnerId }: { id: string; partnerId: string }) {
  const { t } = useI18n(), { session } = useAuthSession();
  const query = useQuery({ queryKey: ['admin', 'partner', session?.user.id, partnerId, 'store', id], queryFn: ({ signal }) => readPartnerStore(id, partnerId, signal), retry: false, gcTime: 0 });
  if (query.isPending) return <p role="status">{t('roles.loading')}</p>;
  if (query.isError) return <Alert tone="danger" action={<Button size="md" onClick={() => { void query.refetch(); }}>{t('roles.retry')}</Button>}>{t(`roles.errors.${roleError(query.error).kind}`)}</Alert>;
  if (!query.data) return <Alert>{t('roles.errors.missing')}</Alert>;
  return <div className={styles.page}><h1>{query.data.name}</h1><StoreFields row={query.data} /><Alert>{t('adminStoreDetail.dataSource')} {t('adminStoreDetail.syncUnknown')}</Alert><StoreRecords id={id} partner /></div>;
}
export function PartnerStorePage() {
  const { id } = useParams(), { t } = useI18n();
  return <section className={styles.page}><div><Button href="/admin/partner/stores" size="md" variant="ghost" iconLeft="arrow-left">{t('roles.myStores')}</Button></div>
    {isStoreId(id) ? <NetworkGate>{partnerId => <PartnerStore key={`${id}:${partnerId}`} id={id} partnerId={partnerId} />}</NetworkGate> : <Alert tone="danger">{t('roles.errors.invalid')}</Alert>}
  </section>;
}
