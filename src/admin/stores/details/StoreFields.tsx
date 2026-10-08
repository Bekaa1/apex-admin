import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { DetailField } from '../../campaigns/details/DetailState';
import type { StoreRow } from '../model';
import { useStorePartner } from './useStoreDetail';
import styles from '../../campaigns/details/CampaignDetail.module.css';

function PartnerValue({ id, partnerId }: { id: string; partnerId: string }) {
  const { t } = useI18n();
  const query = useStorePartner(id, partnerId);
  return <div className={styles.blocks} aria-busy={query.isFetching}>
    <span>{query.isError ? partnerId : query.data?.name || partnerId}</span>
    {query.isPending ? <span className={styles.muted} role="status">{t('adminStoreDetail.partnerLoading')}</span> : null}
    {query.isError || query.data?.unavailable ? <Alert tone="info"
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>
      {t('adminStoreDetail.partnerUnavailable')}
    </Alert> : null}
  </div>;
}

export function StoreFields({ row }: { row: StoreRow }) {
  const { t } = useI18n();
  const unknown = t('adminStores.notSpecified');
  return <section className={styles.panel} aria-labelledby="store-fields-title">
    <h2 id="store-fields-title">{t('adminStoreDetail.basic')}</h2>
    <dl className={styles.fields}>
      <DetailField label={t('adminStores.columns.name')}>{row.name.trim() || unknown}</DetailField>
      <DetailField label={t('adminStores.columns.city')}>{row.city?.trim() || unknown}</DetailField>
      <DetailField label={t('adminStores.columns.address')}>{row.address?.trim() || unknown}</DetailField>
      <DetailField label={t('adminStores.columns.timezone')}>{row.timezone?.trim() || unknown}</DetailField>
      <DetailField label={t('adminStores.columns.partner')} full>{row.partner_id ? <PartnerValue key={`${row.id}:${row.partner_id}`} id={row.id} partnerId={row.partner_id} /> : unknown}</DetailField>
    </dl>
  </section>;
}
