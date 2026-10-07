import { useRef } from 'react';
import { useParams } from 'react-router';
import { Alert, Button, Icon, Meter, Skeleton, StatTile } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatCompactNumber, formatNumber } from '../../lib/format';
import { ButtonLink } from '../ui/ButtonLink';
import { AnalyticsError, AnalyticsLoading, PeriodPicker, StoreStatus } from './AnalyticsShared';
import { CampaignPreview } from './CampaignPreview';
import { PlaysChart } from './PlaysChart';
import { storeMetrics } from './model';
import { useAnalytics, useStoreZones } from './useAnalytics';
import { useAnalyticsFilters } from './useAnalyticsFilters';
import styles from './Analytics.module.css';

export function StoreDetailsPage() {
  const { storeId } = useParams();
  const { t, lang } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const catalog = useAnalytics();
  const filters = useAnalyticsFilters(catalog.data?.today);
  const store = catalog.data?.stores.find((item) => item.id === storeId);
  const zones = useStoreZones(store?.id);
  const refresh = () => { void catalog.refetch(); void zones.refetch(); };
  const back = '/cabinet/analytics' + filters.search;
  if (catalog.isPending) return <AnalyticsLoading />;
  if (!catalog.data) {
    return <div className={styles.page}><ButtonLink to={back} variant="ghost" size="md" iconLeft="arrow-left">{t('analytics.back')}</ButtonLink><AnalyticsError onRetry={() => { void catalog.refetch(); }} refreshing={catalog.isFetching} /></div>;
  }
  if (!store) {
    return (
      <div className={styles.page}>
        <ButtonLink to={back} variant="ghost" size="md" iconLeft="arrow-left" className={styles.back}>{t('analytics.back')}</ButtonLink>
        <Alert tone="warning" title={t('analytics.notFound.title')}>{t('analytics.notFound.description')}</Alert>
      </div>
    );
  }
  const metrics = storeMetrics(store, filters.period, catalog.data.today, filters.from, filters.to, catalog.data.availableFrom);
  const name = store.name;
  const online = store.online;
  const carts = store.carts;
  return (
    <div className={styles.page}>
      <ButtonLink to={back} variant="ghost" size="md" iconLeft="arrow-left" className={styles.back}>{t('analytics.back')}</ButtonLink>
      <header className={styles.storeHero}>
        <div className={styles.heroIdentity}>
          <span className={styles.heroIcon}><Icon name="store" size={34} /></span>
          <div>
            <StoreStatus online={online} carts={carts} />
            <h2 className={styles.title}>{name}</h2>
            <p className={styles.address}><Icon name="map-pin" size={18} />{[store.city, store.address].filter(Boolean).join(' · ') || t('analytics.noAddress')}</p>
          </div>
        </div>
        <Button size="md" iconRight="arrow-right" onClick={() => dialogRef.current?.showModal()}>{t('analytics.launch.button')}</Button>
      </header>
      {catalog.isError ? <AnalyticsError stale onRetry={refresh} refreshing={catalog.isFetching} /> : null}
      <section className={styles.detailPeriod} aria-labelledby="store-overview-title">
        <div className={styles.overviewToolbar}>
          <div className={styles.overviewHeading}>
            <h3 id="store-overview-title">{t('analytics.overview')}</h3>
            <p className={styles.muted}>{t('analytics.overviewHint')}</p>
          </div>
          <PeriodPicker value={filters.period} today={catalog.data.today} from={filters.from} to={filters.to} onChange={filters.setPeriod} onRangeChange={(which, value) => filters.setRange(which, value, catalog.data.today)} />
        </div>
        {!metrics.historyAvailable ? (
          <div className={styles.periodEmpty} role="status">
            <span className={styles.periodEmptyIcon} aria-hidden="true"><Icon name="chart" size={18} /></span>
            <div className={styles.periodEmptyText}>
              <strong>{t('analytics.period.unavailable.title')}</strong>
              <span>{t('analytics.period.unavailable.text')}</span>
            </div>
          </div>
        ) : null}
      </section>
      <div className={styles.kpis}>
        <StatTile icon="video" label={t('analytics.metrics.carts')} value={carts === null ? '—' : formatNumber(carts, lang)} meta={t('analytics.fleet.totalHint')} />
        <StatTile icon="check-circle" label={t('analytics.metrics.online')} value={online !== null ? formatNumber(online, lang) : '—'} meta={carts !== null ? t('analytics.ofCarts', { total: carts }) : t('analytics.noData')} />
        <StatTile icon="play" label={t('analytics.metrics.plays')} value={metrics.plays === null ? '—' : formatCompactNumber(metrics.plays, lang)} meta={t('analytics.period.' + filters.period)} />
        <StatTile icon="chart" label={t('analytics.metrics.average')} value={metrics.average === null ? '—' : formatCompactNumber(metrics.average, lang)} meta={metrics.averageDays ? t('analytics.availableDays', { count: metrics.averageDays }) : t(filters.period === 'today' ? 'analytics.incompleteDay' : 'analytics.noData')} />
      </div>
      <div className={styles.detailGrid}>
        <section className={styles.panel} aria-labelledby="plays-chart-title">
          <div className={styles.panelHeading}><h3 id="plays-chart-title">{t('analytics.chart.title')}</h3><span className={styles.muted}>{t('analytics.chart.unit')}</span></div>
          <PlaysChart key={store.id + filters.period + filters.from + filters.to} days={metrics.days} />
        </section>
        <section className={styles.panel} aria-labelledby="fleet-title">
          <h3 id="fleet-title">{t('analytics.fleet.title')}</h3>
          <p className={styles.description}>{t('analytics.fleet.description')}</p>
          {online !== null && carts !== null ? (
            <>
              <div className={styles.fleetSummary}><strong>{carts ? Math.round(online / carts * 100) : '—'}{carts > 0 ? <span>%</span> : null}</strong><span>{t(carts ? 'analytics.fleet.connected' : 'analytics.status.noCarts')}</span></div>
              <Meter value={carts ? online / carts * 100 : 0} label={t('analytics.fleetMeter', { online, total: carts })} tone={online ? 'success' : 'warning'} />
              <dl className={styles.fleetLegend}>
                <div><dt><span className={styles.onlineDot} />{t('analytics.fleet.online')}</dt><dd>{online}</dd></div>
                <div><dt><span className={styles.offlineDot} />{t('analytics.fleet.offline')}</dt><dd>{carts - online}</dd></div>
              </dl>
            </>
          ) : <p className={styles.noTelemetry}>{t('analytics.fleet.noData')}</p>}
        </section>
      </div>
      <section className={styles.panel} aria-labelledby="zones-title">
        <div className={styles.panelHeading}><h3 id="zones-title">{t('analytics.zones.title')}</h3>{zones.data ? <span className={styles.muted}>{t('analytics.zones.count', { count: zones.data.length })}</span> : null}</div>
        <p className={styles.description}>{t('analytics.zones.description')}</p>
        {zones.isPending ? <div className={styles.loadingRow} role="status" aria-label={t('analytics.zones.loading')}><Skeleton width="80%" height={48} /></div> : null}
        {zones.isError ? <Alert tone="warning" title={t('analytics.zones.error')} action={<Button variant="secondary" size="md" loading={zones.isFetching} onClick={() => { void zones.refetch(); }}>{t('analytics.error.retry')}</Button>}>{t('analytics.zones.errorHint')}</Alert> : null}
        {zones.data?.length ? <div className={styles.zones}>{zones.data.map((zone) => <div className={styles.zone} key={zone.id} title={zone.description ?? undefined}><Icon name="shelf" size={22} /><span>{zone.name}</span></div>)}</div> : zones.isSuccess ? <p className={styles.noTelemetry}>{t('analytics.zones.empty')}</p> : null}
      </section>
      <CampaignPreview dialogRef={dialogRef} store={store} />
    </div>
  );
}
