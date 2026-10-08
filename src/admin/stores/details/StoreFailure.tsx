import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { StoreReadError } from '../api';

export function StoreFailure({ error, pending, onRetry }: { error: unknown; pending: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  const kind = error instanceof StoreReadError ? error.kind : 'unavailable';
  return <Alert tone="danger" title={t(kind === 'denied' ? 'adminStoreDetail.denied' : 'adminStoreDetail.errorTitle')}
    action={<Button size="md" variant="secondary" loading={pending} onClick={onRetry}>{t('cabinet.retry')}</Button>}>
    {t(`adminStoreDetail.errors.${kind}`)}
  </Alert>;
}
