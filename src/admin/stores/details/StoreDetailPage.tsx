import { useLocation, useParams } from 'react-router';
import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { listReturnTo } from '../../../navigation/returnTo';
import { OverviewLoading } from '../../overview/OverviewState';
import { isStoreId, STORE_LIST } from '../model';
import { StoreFailure } from './StoreFailure';
import { StoreFields } from './StoreFields';
import { StoreRecords } from './StoreRecords';
import { useStoreRecord } from './useStoreDetail';
import styles from '../../campaigns/details/CampaignDetail.module.css';

function StoreContent({ id }: { id: string }) {
  const { t } = useI18n();
  const query = useStoreRecord(id);
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) return <StoreFailure error={query.error} pending={query.isFetching} onRetry={() => { void query.refetch(); }} />;
  if (query.data === null) return <Alert title={t('adminStoreDetail.notFound')}>{t('adminStoreDetail.notFoundBody')}</Alert>;
  return <div className={styles.blocks}>
    <StoreFields row={query.data} />
    <StoreRecords id={id} />
  </div>;
}

/** Rendered only by the existing RequireAdmin route tree. */
export function StoreDetailPage() {
  const { id: raw } = useParams();
  const id = raw?.toLowerCase();
  const { state } = useLocation();
  const { t } = useI18n();
  return <section className={styles.page} aria-labelledby="store-detail-title">
    <div><Button href={listReturnTo(state, STORE_LIST)} variant="ghost" size="md" iconLeft="arrow-left">{t('adminStoreDetail.back')}</Button></div>
    <header><h1 id="store-detail-title" tabIndex={-1}>{t('adminStoreDetail.title')}</h1><p className={styles.muted}>{t('adminStoreDetail.description')}</p></header>
    <Alert tone="info" title={t('adminStoreDetail.dataSource')}>{t('adminStoreDetail.syncUnknown')}</Alert>
    {!isStoreId(id) ? <Alert tone="warning">{t('adminStoreDetail.invalidId')}</Alert> : <StoreContent key={id} id={id} />}
  </section>;
}
