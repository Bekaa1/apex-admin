import { Button, Skeleton, StatTile, type IconName } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { fetchOverviewCount, OverviewReadError } from './api';
import type { Counter } from './model';
import { OverviewStamp } from './OverviewState';
import { useOverviewBlock } from './useOverview';
import styles from './OverviewPage.module.css';

const ICONS: Record<Counter, IconName> = { pending: 'clock', awaiting_payment: 'wallet', active: 'play', budget_ended: 'alert-circle', unpaid: 'wallet' };

export function OverviewCounter({ counter }: { counter: Counter }) {
  const { t, lang } = useI18n();
  const query = useOverviewBlock(`count:${counter}`, (signal) => fetchOverviewCount(counter, signal));
  const labelId = `overview-${counter}`;
  const kind = query.error instanceof OverviewReadError ? query.error.kind : 'unavailable';
  return <article className={styles.counter} aria-labelledby={labelId} aria-busy={query.isFetching}>
    <StatTile className={styles.metric} icon={ICONS[counter]} label={<span id={labelId}>{t(`adminOverview.counts.${counter}`)}</span>}
      value={query.isPending ? <Skeleton width="50%" height="1em" /> : query.isError || !query.data ? '—' : formatNumber(query.data.value, lang)}
      meta={query.isPending ? <span role="status">{t('adminOverview.loading')}</span> : <OverviewStamp loadedAt={query.data?.loadedAt} />} />
    {query.isError ? <div className={styles.counterError}>
      <p role="alert">{t(`adminOverview.errors.${kind}`)}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>
    </div> : null}
  </article>;
}
