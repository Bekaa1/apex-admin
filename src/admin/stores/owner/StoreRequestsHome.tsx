import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { useStoreOwnerAccess } from '../../../auth/useStoreOwnerAccess';
import { StoreRequestsPage } from '../requests/StoreRequestsPage';
import { OWNER_QUEUE } from './model';

export function StoreRequestsHome() {
  const { access, query } = useStoreOwnerAccess(), { t } = useI18n();
  return <>
    {access === 'allowed' && <nav aria-label={t('adminStoreOwner.modes')}><Button size="md" variant="secondary" href={OWNER_QUEUE}>{t('adminStoreOwner.queue')}</Button></nav>}
    {access === 'error' && <Alert tone="danger" title={t('adminStoreOwner.accessError')} action={<Button size="md" onClick={() => void query.refetch()}>{t('adminStoreRequests.retry')}</Button>} />}
    <StoreRequestsPage />
  </>;
}
