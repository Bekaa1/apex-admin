import { Link } from 'react-router';
import { Button, Icon, Meter, StatTile, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatCompactNumber, formatNumber } from '../../lib/format';
import { storeMetrics } from './model';
import { AnalyticsError, AnalyticsLoading, PeriodPicker, StoreStatus } from './AnalyticsShared';
import { useAnalytics } from './useAnalytics';
import { useAnalyticsFilters } from './useAnalyticsFilters';
import styles from './Analytics.module.css';

export function AnalyticsPage() {
  const { t, lang } = useI18n();
  const catalog = useAnalytics();
  const filters = useAnalyticsFilters(catalog.data?.today);
  const refresh = () => { void catalog.refetch(); };
  if (catalog.isPending) return <AnalyticsLoading />;
  if (!catalog.data) return <AnalyticsError onRetry={refresh} refreshing={catalog.isFetching} />;
  const { stores: allStores, today } = catalog.data;
  const cities = [...new Set([
    ...allStores.flatMap((store) => store.city ? [store.city] : []),
    ...(filters.city !== 'all' && filters.city !== '__unknown__' ? [filters.city] : []),
  ])].sort((a, b) => a.localeCompare(b, lang));
  const query = filters.query.trim().toLocaleLowerCase();
  const stores = allStores
    .filter((store) => {
      const searchable = [store.name, store.address, store.city].join(' ').toLocaleLowerCase();
      return (filters.city === 'all' || (store.city ?? '__unknown__') === filters.city) && searchable.includes(query);
    })
    .map((store) => ({ ...store, ...storeMetrics(store, filters.period, today, filters.from, filters.to, catalog.data.availableFrom) }))
    .sort((a, b) => {
      if (filters.sort === 'name') return a.name.localeCompare(b.name, lang);
      if (filters.sort === 'carts') return (b.carts ?? -1) - (a.carts ?? -1);
      if (filters.sort === 'online') return (b.online ?? -1) - (a.online ?? -1);
      return (b.plays ?? -1) - (a.plays ?? -1);
    });
  const knownCarts = stores.filter((store) => store.carts !== null);
  const carts = knownCarts.reduce((sum, store) => sum + (store.carts ?? 0), 0);
  const knownOnline = stores.filter((store) => store.online !== null);
  const knownPlays = stores.filter((store) => store.plays !== null);
  const online = knownOnline.reduce((sum, store) => sum + (store.online ?? 0), 0);
  const plays = knownPlays.reduce((sum, store) => sum + (store.plays ?? 0), 0);
  const coverage = (count: number) => t('analytics.coverage', { count, total: stores.length });
  const hasFilters = Boolean(filters.query || filters.city !== 'all' || filters.sort !== 'plays' || filters.period !== 'today');

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>{t('analytics.eyebrow')}</p>
          <h2 className={styles.title}>{t('analytics.title')}</h2>
          <p className={styles.description}>{t('analytics.description')}</p>
        </div>
        <PeriodPicker value={filters.period} today={today} from={filters.from} to={filters.to} onChange={filters.setPeriod} onRangeChange={(which, value) => filters.setRange(which, value, today)} />
      </header>
      {catalog.isError ? <AnalyticsError stale onRetry={refresh} refreshing={catalog.isFetching} /> : null}
      <div className={styles.kpis}>
        <StatTile icon="store" label={t('analytics.metrics.stores')} value={formatNumber(stores.length, lang)} meta={t('analytics.filteredSummary')} />
        <StatTile icon="video" label={t('analytics.metrics.carts')} value={knownCarts.length || !stores.length ? formatNumber(carts, lang) : '—'} meta={coverage(knownCarts.length)} />
        <StatTile icon="check-circle" label={t('analytics.metrics.online')} value={knownOnline.length ? formatNumber(online, lang) : '—'} meta={coverage(knownOnline.length)} />
        <StatTile icon="play" label={t('analytics.metrics.plays')} value={knownPlays.length ? formatCompactNumber(plays, lang) : '—'} meta={coverage(knownPlays.length)} />
      </div>

      <section className={styles.catalog} aria-labelledby="store-catalog-title">
        <div className={styles.catalogHeading}>
          <h3 id="store-catalog-title">{t('analytics.catalog')} <span>{stores.length}</span></h3>
          <p>{t('analytics.catalogHint')}</p>
        </div>
        <div className={styles.filters}>
          <TextField
            label={t('analytics.search.label')}
            type="search"
            placeholder={t('analytics.search.placeholder')}
            value={filters.query}
            onChange={(event) => filters.update('q', event.currentTarget.value)}
            className={styles.search}
          />
          <label className={styles.selectField}>
            <span>{t('analytics.city')}</span>
            <select value={filters.city} onChange={(event) => filters.update('city', event.currentTarget.value)}>
              <option value="all">{t('analytics.allCities')}</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
              {allStores.some((store) => !store.city) || filters.city === '__unknown__' ? <option value="__unknown__">{t('analytics.unknownCity')}</option> : null}
            </select>
          </label>
          <label className={styles.selectField}>
            <span>{t('analytics.sort.label')}</span>
            <select value={filters.sort} onChange={(event) => filters.update('sort', event.currentTarget.value)}>
              {(['plays', 'online', 'carts', 'name'] as const).map((sort) => <option key={sort} value={sort}>{t('analytics.sort.' + sort)}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.results}>
          <p role="status">{t('analytics.results', { count: stores.length })}</p>
          {hasFilters ? <Button variant="ghost" size="md" iconLeft="x" onClick={filters.reset}>{t('analytics.reset')}</Button> : null}
        </div>

        {stores.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>{t('analytics.catalog')}</caption>
              <thead><tr>
                <th scope="col">{t('analytics.columns.store')}</th>
                <th scope="col">{t('analytics.columns.carts')}</th>
                <th scope="col">{t('analytics.metrics.plays')}</th>
                <th scope="col">{t('analytics.metrics.average')}</th>
                <th scope="col"><span className={styles.srOnly}>{t('analytics.details')}</span></th>
              </tr></thead>
              <tbody>
                {stores.map((store) => {
                  const href = '/cabinet/analytics/stores/' + encodeURIComponent(store.id) + filters.search;
                  const name = store.name;
                  return (
                    <tr key={store.id}>
                      <td className={styles.storeCell}>
                        <div className={styles.storeIdentity}>
                          <span className={styles.storeIcon}><Icon name="store" size={22} /></span>
                          <div>
                            <Link className={styles.storeName} to={href}>{name}</Link>
                            <p>{[store.city, store.address].filter(Boolean).join(' · ') || t('analytics.noAddress')}</p>
                            <StoreStatus online={store.online} carts={store.carts} />
                          </div>
                        </div>
                      </td>
                      <td data-label={t('analytics.columns.carts')}>
                        <div className={styles.fleetValue}>
                          <strong>{store.online === null ? '—' : formatNumber(store.online, lang)} <span>/ {store.carts === null ? '—' : formatNumber(store.carts, lang)}</span></strong>
                          {store.online !== null && store.carts !== null ? <Meter value={store.carts ? store.online / store.carts * 100 : 0} label={t('analytics.fleetMeter', { online: store.online, total: store.carts })} size="sm" tone={store.online ? 'success' : 'danger'} /> : <span className={styles.muted}>{t('analytics.noData')}</span>}
                        </div>
                      </td>
                      <td className={styles.numberCell} data-label={t('analytics.metrics.plays')}><strong>{store.plays === null ? '—' : formatCompactNumber(store.plays, lang)}</strong></td>
                      <td className={styles.numberCell} data-label={t('analytics.metrics.average')}>{store.average === null ? '—' : <>{formatCompactNumber(store.average, lang)}<span className={styles.cellHint}>{t('analytics.availableDays', { count: store.averageDays })}</span></>}</td>
                      <td className={styles.actionCell}><Link className={styles.detailLink} to={href} aria-label={t('analytics.openStore', { name })}>{t('analytics.details')} <Icon name="arrow-right" size={18} /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}><Icon name="store" size={28} /></span>
            <h3>{t(allStores.length ? 'analytics.empty.title' : 'analytics.emptyCatalog.title')}</h3>
            <p>{t(allStores.length ? 'analytics.empty.description' : 'analytics.emptyCatalog.description')}</p>
            {hasFilters ? <Button variant="secondary" size="md" onClick={filters.reset}>{t('analytics.reset')}</Button> : null}
          </div>
        )}
      </section>
    </div>
  );
}
