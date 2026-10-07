import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { AuditReadError } from './api';

export function AuditError({ error, pending, retry }: { error: unknown; pending: boolean; retry: () => void }) {
  const { t } = useI18n();
  const kind = error instanceof AuditReadError ? error.kind : 'unavailable';
  return <Alert tone="danger" title={t(`adminAudit.errors.${kind}.title`)} action={<Button size="md" variant="secondary" loading={pending} onClick={retry}>{t('cabinet.retry')}</Button>}>
    {t(`adminAudit.errors.${kind}.body`)}
  </Alert>;
}
