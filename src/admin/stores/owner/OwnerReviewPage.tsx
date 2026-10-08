import { useOutletContext, useParams } from 'react-router';
import { Alert, Button, Skeleton } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { useAuthSession } from '../../../auth/useAuthSession';
import { isStoreId } from '../model';
import { failure } from '../onboarding/errors';
import { useStoreRequest } from '../onboarding/useStoreRequest';
import { OWNER_QUEUE } from './model';
import { OwnerDecision } from './OwnerDecision';

export function OwnerReviewPage() {
  const { requestId } = useParams(), { t } = useI18n(), { session } = useAuthSession();
  const permission = useOutletContext<{ owner: boolean }>();
  const query = useStoreRequest(requestId);
  if (!isStoreId(requestId)) return <Alert tone="danger" title={t('adminStoreRequest.errors.invalidId')} />;
  if (query.isPending || query.isFetching) return <div role="status" aria-busy="true"><p>{t('adminStoreRequest.loading')}</p><Skeleton variant="block" height="120px" /></div>;
  if (query.isError || !query.data) return <Alert tone="danger" title={t(`adminStoreOwner.errors.${failure(query.error).kind}`)} action={<Button size="md" onClick={() => void query.refetch()}>{t('adminStoreRequests.retry')}</Button>} />;
  if (!session || permission?.owner !== true) return <Alert tone="danger" title={t('adminStoreOwner.errors.forbidden')} />;
  return <><Button href={OWNER_QUEUE} size="md" variant="secondary">{t('adminStoreOwner.queue')}</Button>
    <OwnerDecision key={`${session.user.id}:${requestId}`} userId={session.user.id} owner record={query.data} onRefresh={() => void query.refetch()} /></>;
}
