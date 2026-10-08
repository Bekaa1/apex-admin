import { useState } from 'react';
import { useI18n } from '../../../i18n/i18n';
import { fetchPlacement } from './api';
import { DetailFailure, DetailQuery, RelatedNavigation } from './DetailState';
import type { PlacementKind } from './model';
import { useCampaignDetailQuery } from './useCampaignDetail';
import styles from './CampaignDetail.module.css';

function PlacementList({ id, kind }: { id: string; kind: PlacementKind }) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const query = useCampaignDetailQuery(id, [kind, page], (signal) => fetchPlacement(id, kind, page, signal));
  const label = t(`adminCampaignDetail.${kind}`);
  return <section className={styles.subsection} aria-label={label} aria-busy={query.isFetching}>
    <h3>{label}</h3>
    <DetailQuery query={query}>{({ rows, count, namesError }) => <>
      {namesError ? <><p className={styles.muted}>{t('adminCampaignDetail.namesUnavailable')}</p><DetailFailure kind={namesError} pending={query.isFetching} retry={() => { void query.refetch(); }} /></> : null}
      {rows.length ? <ul className={styles.placements}>{rows.map((row) => <li key={row.id}>
        <span>{row.name?.trim() || row.targetId || t('adminCampaigns.noData')}</span>
        {row.name && row.targetId ? <span className={styles.identifier}>{row.targetId}</span> : null}
      </li>)}</ul> : <p className={styles.empty}>{t(page > 1 ? 'adminCampaignDetail.pageEmpty' : 'adminCampaignDetail.placementMissing')}</p>}
      <RelatedNavigation page={page} count={count} pending={query.isFetching} onPage={setPage} label={label} />
    </>}</DetailQuery>
  </section>;
}
export function PlacementDetails({ id }: { id: string }) {
  const { t } = useI18n();
  return <section className={styles.panel} aria-labelledby="campaign-placement">
    <h2 id="campaign-placement">{t('adminCampaignDetail.placement')}</h2>
    <PlacementList id={id} kind="stores" /><PlacementList id={id} kind="zones" />
  </section>;
}
