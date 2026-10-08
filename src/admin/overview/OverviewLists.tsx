import { useId } from 'react';
import { Link, useLocation } from 'react-router';
import { Badge } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { fetchLatestCorporate, fetchPendingCampaigns } from './api';
import { overviewDate } from './model';
import { OverviewFailure, OverviewLoading, OverviewStamp } from './OverviewState';
import { useOverviewBlock } from './useOverview';
import styles from './OverviewPage.module.css';

export function PendingOverview() {
  const { t, lang } = useI18n();
  const titleId = useId();
  const query = useOverviewBlock('oldest-pending', fetchPendingCampaigns);
  return <section className={styles.panel} aria-labelledby={titleId} aria-busy={query.isFetching}>
    <header><h2 id={titleId}>{t('adminOverview.pending.title')}</h2><p className={styles.muted}>{t('adminOverview.pending.description')}</p></header>
    <OverviewStamp loadedAt={query.data?.loadedAt} />
    {query.isPending ? <OverviewLoading /> : query.isError ? <OverviewFailure error={query.error} pending={query.isFetching} retry={() => { void query.refetch(); }} />
      : query.data.value.length === 0 ? <p className={styles.empty}>{t('adminOverview.pending.empty')}</p>
      : <div className={styles.tableWrap} role="region" aria-label={t('adminOverview.pending.title')} tabIndex={0}>
        <table className={styles.table}><thead><tr><th scope="col">{t('adminOverview.number')}</th><th scope="col">{t('adminOverview.name')}</th><th scope="col">{t('adminOverview.created')}</th></tr></thead>
          <tbody>{query.data.value.map((row) => <tr key={row.id}>
            <td>{Number.isSafeInteger(row.display_id) ? '№ ' + formatNumber(row.display_id, lang) : t('adminOverview.unknown')}</td>
            <td>{row.title?.trim() || row.name?.trim() || t('adminOverview.untitled')}</td>
            <td>{overviewDate(row.created_at, lang, t('adminOverview.unknown'))}</td>
          </tr>)}</tbody></table>
      </div>}
  </section>;
}

export function CorporateOverview() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const titleId = useId();
  const query = useOverviewBlock('latest-corporate', fetchLatestCorporate);
  return <section className={styles.panel} aria-labelledby={titleId} aria-busy={query.isFetching}>
    <header><h2 id={titleId}>{t('adminOverview.corporate.title')}</h2><p className={styles.muted}>{t('adminOverview.corporate.description')}</p></header>
    <OverviewStamp loadedAt={query.data?.loadedAt} />
    {query.isPending ? <OverviewLoading /> : query.isError ? <OverviewFailure error={query.error} pending={query.isFetching} retry={() => { void query.refetch(); }} />
      : query.data.value.length === 0 ? <p className={styles.empty}>{t('adminOverview.corporate.empty')}</p>
      : <div className={styles.tableWrap} role="region" aria-label={t('adminOverview.corporate.title')} tabIndex={0}>
        <table className={styles.table}><thead><tr><th scope="col">{t('adminOverview.company')}</th><th scope="col">{t('adminOverview.created')}</th><th scope="col">{t('adminOverview.status')}</th></tr></thead>
          <tbody>{query.data.value.map((row) => <tr key={row.id}>
            <td><Link className={styles.requestLink} to={'/admin/corporate-requests/' + encodeURIComponent(row.id)} state={{ returnTo: location.pathname + location.search }}>{row.company.trim() || t('adminOverview.notSpecified')}</Link></td><td>{overviewDate(row.created_at, lang, t('adminOverview.unknown'))}</td>
            <td><Badge className={styles.status}>{row.status || t('adminOverview.unknown')}</Badge></td>
          </tr>)}</tbody></table>
      </div>}
  </section>;
}
