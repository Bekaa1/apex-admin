import { useSearchParams } from 'react-router';
import { Alert, Button, Skeleton, TextField } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { failure } from '../onboarding/errors';
import { requestPath } from '../onboarding/model';
import { isStatus, PAGE_SIZE, readSelection, SEARCH_LIMIT, searchRows, selectionParams, STATUSES } from './model';
import { useStoreRequests } from './useStoreRequests';
import { StoreRequestRows } from './StoreRequestRows';
import styles from './StoreRequests.module.css';

export function StoreRequestsPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const selection = readSelection(params), query = useStoreRequests(selection);
  const reset = () => setParams(selectionParams('', ''));
  const filtered = query.data ? searchRows(query.data.rows, selection.search) : [];
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((selection.page - 1) * PAGE_SIZE, selection.page * PAGE_SIZE);
  const knownError = query.isError ? failure(query.error).kind : null;
  const error = knownError === 'forbidden' || knownError === 'not_authenticated' ? knownError : 'unavailable';
  const empty = query.data?.received && !query.data.rows.length ? 'damaged' : selection.search.trim() || selection.status ? 'noMatches' : 'empty';
  return <section className={styles.page} aria-labelledby="store-requests-title">
    <header className={styles.header}><h1 id="store-requests-title">{t('adminStoreRequests.title')}</h1>
      <div className={styles.actions}><Button href="/admin/stores" size="md" variant="secondary">{t('adminStoreRequests.toStores')}</Button>
        <Button href={requestPath(undefined)} size="md" iconLeft="plus">{t('adminStoreRequest.title')}</Button></div>
    </header>
    <div className={styles.filters}>
      <label className={styles.select}><span>{t('adminStoreRequests.statusFilter')}</span>
        <select value={selection.status} onChange={event => { const status = event.target.value; if (status === '' || isStatus(status)) setParams(selectionParams(status, selection.search)); }}>
          <option value="">{t('adminStoreRequests.all')}</option>{STATUSES.map(status => <option value={status} key={status}>{t(`adminStoreRequests.filters.${status}`)}</option>)}
        </select>
      </label>
      <TextField label={t('adminStoreRequests.search')} hint={t('adminStoreRequests.searchHint')} value={selection.search} maxLength={SEARCH_LIMIT} autoComplete="off"
        onChange={event => setParams(selectionParams(selection.status, event.target.value), { replace: true, preventScrollReset: true })} />
      <div className={styles.actions}><Button size="md" variant="secondary" disabled={selection.invalid || query.isFetching} loading={query.isFetching} onClick={() => void query.refetch()}>{t('adminStoreRequests.refresh')}</Button>
        <Button size="md" variant="ghost" onClick={reset}>{t('adminStoreRequests.reset')}</Button></div>
    </div>
    {selection.invalid ? <Alert tone="danger" title={t('adminStoreRequests.invalidFilters')} action={<Button size="md" onClick={reset}>{t('adminStoreRequests.reset')}</Button>} />
      : query.isPending || query.isFetching ? <div role="status" aria-busy="true"><p>{t('adminStoreRequests.loading')}</p><Skeleton variant="block" height="120px" /></div>
      : query.isError || !query.data ? <Alert tone="danger" title={t(`adminStoreRequests.errors.${error}`)} action={error === 'not_authenticated'
        ? <Button size="md" href="/login">{t('adminStoreRequest.signIn')}</Button>
        : <Button size="md" onClick={() => void query.refetch()}>{t('adminStoreRequests.retry')}</Button>} />
      : <>
        <p className={styles.muted} role="status">{t('adminStoreRequests.received', { count: query.data.received })} · {t('adminStoreRequests.searchScope')}</p>
        {query.data.skipped > 0 && <Alert tone="warning" title={t('adminStoreRequests.skipped', { count: query.data.skipped })} />}
        {rows.length > 0 ? <StoreRequestRows rows={rows} /> : <div className={styles.empty} role="status"><h2>{t(`adminStoreRequests.${selection.page > pageCount ? 'pageEmpty' : empty}`)}</h2>
          {(selection.search || selection.status) && <Button variant="secondary" size="md" onClick={reset}>{t('adminStoreRequests.reset')}</Button>}
        </div>}
        {selection.page > pageCount ? <Button size="md" variant="secondary" onClick={() => setParams(selectionParams(selection.status, selection.search))}>{t('adminStoreRequests.firstPage')}</Button>
          : filtered.length > 0 && <nav className={styles.actions} aria-label={t('adminStoreRequests.pagination')}>
            <Button size="md" variant="secondary" disabled={selection.page <= 1} onClick={() => setParams(selectionParams(selection.status, selection.search, selection.page - 1))}>{t('adminStoreRequests.previous')}</Button>
            <p>{t('adminStoreRequests.page', { page: selection.page, count: pageCount })}</p>
            <Button size="md" variant="secondary" disabled={selection.page >= pageCount} onClick={() => setParams(selectionParams(selection.status, selection.search, selection.page + 1))}>{t('adminStoreRequests.next')}</Button>
          </nav>}
        <p className={styles.muted}>{t('adminStoreRequests.scope')}</p>
      </>}
  </section>;
}
