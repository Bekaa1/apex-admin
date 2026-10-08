import { Badge } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber } from '../../../lib/format';
import { campaignStatus } from '../model';
import { fetchAdvertiser, fetchTariff } from './api';
import { DetailFailure, DetailField, DetailQuery } from './DetailState';
import { campaignDate, type CampaignDetail } from './model';
import { useCampaignDetailQuery } from './useCampaignDetail';
import styles from './CampaignDetail.module.css';

function AdvertiserDetails({ id, campaignId }: { id: string; campaignId: string }) {
  const { t } = useI18n();
  const query = useCampaignDetailQuery(campaignId, ['advertiser', id], (signal) => fetchAdvertiser(id, signal));
  const noData = t('adminCampaigns.noData');
  return <div className={styles.subsection} aria-busy={query.isFetching}>
    <h3>{t('adminCampaignDetail.advertiser')}</h3><p className={styles.identifier}>{id}</p>
    <DetailQuery query={query}>{(profile) => profile === null
      ? <DetailFailure kind="notVisible" retry={() => { void query.refetch(); }} pending={query.isFetching} />
      : <dl className={styles.fields}>
        <DetailField label={t('adminCampaignDetail.person')}>{profile.full_name?.trim() || profile.display_name?.trim() || noData}</DetailField>
        <DetailField label={t('adminCampaignDetail.company')}>{profile.company_name?.trim() || noData}</DetailField>
      </dl>}</DetailQuery>
  </div>;
}
function TariffDetails({ id, campaignId }: { id: string; campaignId: string }) {
  const { t } = useI18n();
  const query = useCampaignDetailQuery(campaignId, ['tariff', id], (signal) => fetchTariff(id, signal));
  return <div className={styles.subsection} aria-busy={query.isFetching}>
    <h3>{t('adminCampaigns.columns.tariff')}</h3><p className={styles.identifier}>{id}</p>
    <DetailQuery query={query}>{(tariff) => tariff === null
      ? <DetailFailure kind="notVisible" retry={() => { void query.refetch(); }} pending={query.isFetching} />
      : <p>{tariff.name.trim() || tariff.code || t('adminCampaigns.noData')}</p>}</DetailQuery>
  </div>;
}
export function BasicDetails({ row }: { row: CampaignDetail }) {
  const { t, lang } = useI18n();
  const unknown = t('adminCampaigns.noData');
  const status = campaignStatus(row.status);
  return <section className={styles.panel} aria-labelledby="campaign-main">
    <h2 id="campaign-main">{t('adminCampaignDetail.basic')}</h2>
    <dl className={styles.fields}>
      <DetailField label={t('adminCampaigns.columns.number')}>{row.display_id === null ? unknown : '№ ' + formatNumber(row.display_id, lang)}</DetailField>
      <DetailField label={t('adminCampaigns.columns.status')}><Badge tone={status.tone} className={styles.status}>{status.key ? t(status.key) : status.raw}</Badge></DetailField>
      <DetailField full label={t('adminCampaigns.columns.name')}>{row.title?.trim() || row.name?.trim() || unknown}</DetailField>
      <DetailField full label={t('adminCampaignDetail.description')}>{row.description?.trim() || unknown}</DetailField>
      {(['created_at', 'submitted_at', 'start_date', 'end_date'] as const).map((key) => <DetailField key={key} label={t(`adminCampaignDetail.dates.${key}`)}>{campaignDate(row[key], lang, unknown)}</DetailField>)}
      <DetailField full label={t('adminCampaignDetail.id')}>{row.id}</DetailField>
    </dl>
    {row.tariff_id ? <TariffDetails id={row.tariff_id} campaignId={row.id} /> : <dl className={styles.fields}><DetailField label={t('adminCampaigns.columns.tariff')}>{unknown}</DetailField></dl>}
    {row.user_id ? <AdvertiserDetails id={row.user_id} campaignId={row.id} /> : <dl className={styles.fields}><DetailField label={t('adminCampaignDetail.advertiser')}>{unknown}</DetailField></dl>}
  </section>;
}
