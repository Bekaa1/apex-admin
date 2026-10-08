import { Alert, Badge, Button, Skeleton } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { failure } from '../onboarding/errors';
import { STORE_REQUEST_LIST } from '../onboarding/model';
import { ownerRequestPath } from './model';
import { useOwnerQueue } from './useOwnerQueue';
import styles from './Owner.module.css';

export function OwnerQueuePage() {
  const { t, lang } = useI18n(), query = useOwnerQueue();
  const formatter = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Almaty' });
  return <section className={styles.page}>
    <header className={styles.actions}><h1>{t('adminStoreRequests.title')}</h1><Button href={STORE_REQUEST_LIST} variant="secondary" size="md">{t('adminStoreOwner.all')}</Button></header>
    <h2>{t('adminStoreOwner.queue')}</h2>
    <Button size="md" variant="secondary" disabled={query.isFetching} loading={query.isFetching} onClick={() => void query.refetch()}>{t('adminStoreRequests.refresh')}</Button>
    {query.isPending || query.isFetching ? <div role="status" aria-busy="true"><p>{t('adminStoreRequests.loading')}</p><Skeleton variant="block" height="120px" /></div>
      : query.isError || !query.data ? <Alert tone="danger" title={t(`adminStoreOwner.errors.${failure(query.error).kind}`)}
        action={<Button size="md" href={failure(query.error).kind === 'not_authenticated' ? '/login' : undefined} onClick={() => void query.refetch()}>{t(failure(query.error).kind === 'not_authenticated' ? 'adminStoreRequest.signIn' : 'adminStoreRequests.retry')}</Button>} />
      : <>
        {query.data.skipped > 0 && <Alert tone="warning" title={t('adminStoreRequests.skipped', { count: query.data.skipped })} />}
        {!query.data.rows.length ? <Alert title={t(query.data.skipped ? 'adminStoreRequests.damaged' : 'adminStoreOwner.empty')} />
          : <ul className={styles.queue}>{query.data.rows.map(row => <li className={styles.card} key={row.id}>
            <h3>{row.name || t('adminStoreRequests.unnamed')}</h3>
            {row.isMine && <Badge tone="brand">{t('adminStoreRequests.mine')}</Badge>}
            <dl>{(['city', 'address', 'timezone'] as const).map(field => <div key={field}><dt>{t(`adminStoreRequest.fields.${field}`)}</dt><dd>{row[field] || t('adminStoreRequests.notSpecified')}</dd></div>)}
              <div><dt>{t('adminStoreReview.submittedAt')}</dt><dd>{row.submittedAt ? formatter.format(new Date(row.submittedAt)) : t('adminStoreRequests.notSpecified')}</dd></div>
              <div><dt>{t('adminStoreRequests.columns.plan')}</dt><dd>{t(`adminStoreRequests.${row.hasPlan ? 'hasPlan' : 'noPlan'}`)}</dd></div>
              <div><dt>{t('adminStoreRequests.columns.zones')}</dt><dd>{row.zoneCount}</dd></div>
            </dl>
            <Button size="md" href={ownerRequestPath(row.id)}>{t('adminStoreOwner.consider')}</Button>
          </li>)}</ul>}
        <p className={styles.muted}>{t('adminStoreRequests.scope')}</p>
      </>}
  </section>;
}
