import { Alert, Button, Skeleton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { OverviewReadError } from './api';
import { overviewDate } from './model';
import styles from './OverviewPage.module.css';

export function OverviewStamp({ loadedAt }: { loadedAt: number | undefined }) {
  const { t, lang } = useI18n();
  return <span className={styles.stamp}>{loadedAt === undefined ? t('adminOverview.notLoaded') : <>
    {t('adminOverview.lastLoaded')} <time dateTime={new Date(loadedAt).toISOString()}>{overviewDate(loadedAt, lang, t('adminOverview.unknown'))}</time> · Asia/Almaty
  </>}</span>;
}

export function OverviewLoading() {
  const { t } = useI18n();
  return <div role="status" aria-busy="true"><p>{t('adminOverview.loading')}</p><Skeleton variant="block" height="var(--control-lg)" /></div>;
}

export function OverviewFailure({ error, pending, retry }: { error: unknown; pending: boolean; retry: () => void }) {
  const { t } = useI18n();
  const kind = error instanceof OverviewReadError ? error.kind : 'unavailable';
  return <Alert tone="danger" title={t('adminOverview.errorTitle')} action={<Button size="md" variant="secondary" loading={pending} onClick={retry}>{t('cabinet.retry')}</Button>}>
    {t(`adminOverview.errors.${kind}`)}
  </Alert>;
}
