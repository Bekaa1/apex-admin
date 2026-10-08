import { Link } from 'react-router';
import { Button, Icon } from '../../design-system';
import { usePermissions } from '../../auth/usePermissions';
import { useI18n } from '../../i18n/i18n';
import { CAMPAIGN_COUNTERS } from './model';
import { OverviewCounter } from './OverviewCounter';
import { CorporateOverview, PendingOverview } from './OverviewLists';
import { useRefreshOverview } from './useOverview';
import styles from './OverviewPage.module.css';

/** This lazy page mounts only inside RequireAdmin's successful Outlet. */
export function OverviewPage() {
  const { t } = useI18n();
  const { can } = usePermissions();
  const { pending, refresh } = useRefreshOverview();
  return <div className={styles.page}>
    <header className={styles.heading}>
      <div><h1>{t('adminOverview.title')}</h1><p className={styles.muted}>{t('adminOverview.description')}</p></div>
      <Button size="md" variant="secondary" iconLeft="refresh" loading={pending} onClick={refresh}>{t('adminOverview.refresh')}</Button>
    </header>
    <p className={styles.muted}>{t('adminOverview.scope')}</p>
    <section className={styles.counters} aria-label={t('adminOverview.campaigns')}>
      {CAMPAIGN_COUNTERS.map((counter) => <OverviewCounter key={counter} counter={counter} />)}
    </section>
    <div className={styles.secondary}>
      {can('invoices') ? <OverviewCounter counter="unpaid" /> : null}
      <nav className={styles.quickLinks} aria-label={t('adminOverview.sections')}>
        {can('media') ? <Link className={styles.quickLink} to="/admin/media"><Icon name="video" /><span>{t('adminMedia.title')}</span><Icon name="arrow-right" /></Link> : null}
        {can('audit') ? <Link className={styles.quickLink} to="/admin/audit"><Icon name="clock" /><span>{t('adminAudit.title')}</span><Icon name="arrow-right" /></Link> : null}
      </nav>
    </div>
    <div className={styles.lists}><PendingOverview />{can('corporate') ? <CorporateOverview /> : null}</div>
    <p className={styles.muted}>{t('adminOverview.refreshHint')}</p>
  </div>;
}
