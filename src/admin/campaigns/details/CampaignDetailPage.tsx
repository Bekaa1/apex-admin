import { useLocation, useParams } from 'react-router';
import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { usePermissions } from '../../../auth/usePermissions';
import { listReturnTo } from '../../../navigation/returnTo';
import { CAMPAIGN_LIST, MODERATION_LIST, isCampaignId } from '../model';
import { ModerationActions } from '../moderation/ModerationActions';
import { CampaignStatusAction } from '../../roles/CampaignStatusAction';
import { fetchCampaignDetail } from './api';
import { BasicDetails } from './BasicDetails';
import { CreativeDetails } from './CreativeDetails';
import { DetailQuery } from './DetailState';
import { FinanceDetails } from './FinanceDetails';
import { ModerationDetails } from './ModerationDetails';
import { PlacementDetails } from './PlacementDetails';
import { useCampaignDetailQuery } from './useCampaignDetail';
import styles from './CampaignDetail.module.css';

export function CampaignDetailPage() {
  const params = useParams();
  const id = params.id?.toLowerCase();
  const { state } = useLocation();
  const { t } = useI18n();
  const { can } = usePermissions();
  const query = useCampaignDetailQuery(id, ['record'], (signal) => fetchCampaignDetail(id ?? '', signal));
  const queueReturn = listReturnTo(state, MODERATION_LIST);
  const fromQueue = queueReturn !== MODERATION_LIST || Boolean(state && typeof state === 'object' && 'returnTo' in state && state.returnTo === MODERATION_LIST);
  const returnTo = fromQueue ? queueReturn : listReturnTo(state, CAMPAIGN_LIST);
  return <section className={styles.page} aria-labelledby="campaign-detail-title" aria-busy={query.isFetching}>
    <div><Button href={returnTo} variant="ghost" size="md" iconLeft="arrow-left">{t(fromQueue ? 'adminModeration.back' : 'adminCampaigns.back')}</Button></div>
    <header><h1 id="campaign-detail-title" tabIndex={-1}>{t('adminCampaigns.detailTitle')}</h1><p className={styles.muted}>{t('adminModeration.detailDescription')}</p></header>
    {can('moderate') && isCampaignId(id) ? <ModerationActions key={id} id={id} row={query.isError ? undefined : query.data} fetching={query.isFetching} /> : null}
    {can('moderate') && isCampaignId(id) ? <CampaignStatusAction key={`status:${id}`} id={id} row={query.isError ? undefined : query.data} fetching={query.isFetching} /> : null}
    {!isCampaignId(id) ? <Alert tone="warning">{t('adminCampaigns.invalidId')}</Alert>
      : <DetailQuery query={query}>{(row) => row === null
        ? <Alert title={t('adminCampaignDetail.notFound')}>{t('adminCampaignDetail.notFoundBody')}</Alert>
        : <div key={row.id} className={styles.blocks}>
          <BasicDetails row={row} /><CreativeDetails row={row} /><PlacementDetails id={row.id} /><FinanceDetails row={row} /><ModerationDetails row={row} />
        </div>}</DetailQuery>}
    <p className={styles.muted}>{t('adminCampaignDetail.scope')}</p>
  </section>;
}
