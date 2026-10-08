import { useMemo, useState } from 'react';
import { Alert, Button, SearchField, Select, Skeleton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { MediaLoadError, formatMediaDate, formatMediaSize, visibleMedia, type MediaSort } from './model';
import { useUnusedMedia } from './useUnusedMedia';
import styles from './MediaPage.module.css';

const SORTS: MediaSort[] = ['server', 'nameAsc', 'nameDesc', 'sizeDesc', 'newest'];
const LOCALES = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' };

export function MediaPage() {
  const { t, lang } = useI18n();
  const query = useUnusedMedia();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MediaSort>('server');
  const locale = LOCALES[lang];
  const files = query.data?.files;
  const visible = useMemo(() => visibleMedia(files ?? [], search, sort, locale), [files, search, sort, locale]);
  const errorKind = query.error instanceof MediaLoadError ? query.error.kind : 'unavailable';
  const unknown = t('adminMedia.unknown');
  const refresh = () => { if (!query.isFetching) void query.refetch(); };

  return <section className={styles.page} aria-labelledby="admin-media-title">
    <header className={styles.heading}>
      <div>
        <h1 id="admin-media-title">{t('adminMedia.title')}</h1>
        <p className={styles.muted}>{t('adminMedia.description')}</p>
      </div>
      <Button size="md" variant="secondary" iconLeft="refresh" loading={query.isFetching} onClick={refresh}>{t('adminMedia.refresh')}</Button>
    </header>
    <Alert tone="warning">{t('adminMedia.caution')}</Alert>
    <p className={styles.muted}>
      {query.data
        ? <>{t('adminMedia.lastLoaded')} <time dateTime={new Date(query.data.loadedAt).toISOString()}>{formatMediaDate(query.data.loadedAt, locale, unknown)} UTC</time></>
        : t('adminMedia.notLoaded')}
    </p>
    {query.isPending ? <div className={styles.state} role="status" aria-busy="true">
      <p>{t('adminMedia.loading')}</p>
      <Skeleton variant="block" height="var(--space-11)" />
    </div> : query.isError ? <Alert tone="danger" title={t(`adminMedia.errors.${errorKind}.title`)} action={
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={refresh}>{t('cabinet.retry')}</Button>
    }>{t(`adminMedia.errors.${errorKind}.body`)}</Alert> : files ? <div className={styles.panel} aria-busy={query.isFetching}>
      <div className={styles.summary}>
        <p className={styles.count}>{t('adminMedia.received', { count: new Intl.NumberFormat(locale).format(files.length) })}</p>
        <p className={styles.muted}>{t('adminMedia.limits')}</p>
        {query.isFetching ? <p role="status">{t('adminMedia.refreshing')}</p> : null}
      </div>
      {files.length ? <>
        <div className={styles.filters}>
          <SearchField label={t('adminMedia.search')} value={search} onValueChange={setSearch} clearLabel={t('adminMedia.clear')} size="md" aria-describedby="admin-media-local-hint" />
          <Select label={t('adminMedia.sortLabel')} size="md" value={sort} onValueChange={setSort} options={SORTS.map((value) => ({ value, label: t(`adminMedia.sort.${value}`) }))} aria-describedby="admin-media-local-hint" />
        </div>
        <p id="admin-media-local-hint" className={styles.muted}>{t('adminMedia.localHint')}</p>
        <p className={styles.muted} role="status">{t('adminMedia.matches', { count: new Intl.NumberFormat(locale).format(visible.length) })}</p>
        {visible.length ? <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={t('adminMedia.tableLabel')}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>{t('adminMedia.tableLabel')}</caption>
            <thead><tr><th scope="col">{t('adminMedia.columns.name')}</th><th scope="col">{t('adminMedia.columns.size')}</th><th scope="col">{t('adminMedia.columns.created')}</th></tr></thead>
            <tbody>{visible.map((file, index) => <tr key={index}>
              <td className={styles.path}>{file.name ?? unknown}</td>
              <td>{formatMediaSize(file.sizeBytes, locale, unknown)}</td>
              <td>{file.createdAt === null ? unknown : <time dateTime={new Date(file.createdAt).toISOString()}>{formatMediaDate(file.createdAt, locale, unknown)}</time>}</td>
            </tr>)}</tbody>
          </table>
        </div> : <div className={styles.state}>
          <h2>{t('adminMedia.noMatches.title')}</h2><p>{t('adminMedia.noMatches.body')}</p>
          <Button size="md" variant="secondary" onClick={() => setSearch('')}>{t('adminMedia.clear')}</Button>
        </div>}
      </> : <div className={styles.state}><h2>{t('adminMedia.empty.title')}</h2><p>{t('adminMedia.empty.body')}</p></div>}
    </div> : null}
  </section>;
}
