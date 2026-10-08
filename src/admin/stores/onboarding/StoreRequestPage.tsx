import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Skeleton, Stepper } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { useAuthSession } from '../../../auth/useAuthSession';
import { isStoreId, storeDetailPath } from '../model';
import { failure } from './errors';
import { createAttemptStore } from './attempt';
import { requestKey, requestPath, STEPS, STORE_REQUEST_LIST, type Step } from './model';
import { useStoreRequest } from './useStoreRequest';
import { StoreRequestForm } from './StoreRequestForm';
import type { SaveResult } from './save';
import { StorePlanStep } from './plan/StorePlanStep';
import type { PlanSaveResult } from './plan/save';
import { StoreZoningStep } from './zoning/StoreZoningStep';
import type { ZoningSaveResult } from './zoning/save';
import { StoreReviewStep } from './review/StoreReviewStep';
import styles from './StoreRequestPage.module.css';

export function StoreRequestPage() {
  const { session, status } = useAuthSession();
  const { requestId } = useParams();
  const [params] = useSearchParams();
  useEffect(() => {
    if (session && requestId && isStoreId(requestId)) {
      try { createAttemptStore(session.user.id, window.sessionStorage, () => crypto.randomUUID()).acknowledge(requestId); } catch { /* storage is optional after routing */ }
    }
  }, [session, requestId]);
  if (status !== 'ready' || !session) return null;
  return <RequestPage key={`${session.user.id}:${requestId ?? 'new'}:${params.get('step') ?? 'details'}`} userId={session.user.id} id={requestId} />;
}

function RequestPage({ userId, id }: { userId: string; id?: string }) {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useStoreRequest(id);
  const [notice, setNotice] = useState<SaveResult['outcome'] | null>(null);
  const rawStep = params.get('step') ?? 'details';
  const validId = !id || isStoreId(id);
  const validStep = STEPS.includes(rawStep as Step) && params.getAll('step').length <= 1;
  const step = validStep ? rawStep as Step : 'details';
  if (validId && !validStep) return <Navigate to={requestPath(id)} replace />;
  const record = id ? query.data ?? null : null;
  async function reload() {
    const result = await query.refetch();
    if (result.error) throw result.error;
    if (!result.data) throw new Error('invalid_response');
    setNotice('changed');
    return result.data;
  }
  function saved(result: SaveResult, next: boolean) {
    client.setQueryData(requestKey(userId, result.record.id), result.record);
    setNotice(result.outcome);
    // Created records are read again after route replacement, including idempotent retries.
    if (result.created || (next && result.outcome === 'saved')) {
      navigate(requestPath(result.record.id, next && result.outcome === 'saved' ? 'plan' : 'details'), { replace: result.created });
    }
  }
  function planSaved(result: PlanSaveResult, next: boolean) {
    client.setQueryData(requestKey(userId, result.record.id), result.record);
    if (next && result.outcome === 'saved') navigate(requestPath(result.record.id, 'zoning'));
  }
  function zoningSaved(result: ZoningSaveResult, next: boolean) {
    client.setQueryData(requestKey(userId, result.record.id), result.record);
    if (next && result.outcome === 'saved') navigate(requestPath(result.record.id, 'review'));
  }
  return <section className={styles.page} aria-labelledby="store-request-title">
    <header><h1 id="store-request-title">{t('adminStoreRequest.title')}</h1></header>
    <Stepper steps={STEPS.map(item => ({ key: item, label: t(`adminStoreRequest.steps.${item}`), state: item === step ? 'current' : 'todo' }))}
      label={t('adminStoreRequest.stepsLabel')} countText={t('adminStoreRequest.currentStep', { number: STEPS.indexOf(step) + 1 })}
      stateLabels={{ current: t('adminStoreRequest.stepCurrent'), todo: t('adminStoreRequest.stepTodo'), done: '', skipped: '' }} />
    {!validId ? <Alert tone="danger" title={t('adminStoreRequest.errors.invalidId')} />
      : id && (query.isPending || (query.isFetching && (step !== 'plan' || query.data?.plan === undefined))) ? <div role="status" aria-busy="true"><p>{t('adminStoreRequest.loading')}</p><Skeleton variant="block" height="var(--control-lg)" /></div>
      : id && query.isError ? <Alert tone="danger" title={t(`adminStoreRequest.errors.${failure(query.error).kind}`)} action={<Button size="md" onClick={() => void query.refetch()}>{t('adminStoreRequest.retry')}</Button>} />
      : step === 'plan' && record ? <StorePlanStep key={`${id}:plan`} record={record} onSaved={planSaved} onReload={reload} />
      : step === 'plan' ? <div className={styles.panel}><Alert title={t('adminStorePlan.requestRequired')} /><Button size="md" href={requestPath(id)}>{t('adminStoreRequest.backDetails')}</Button></div>
      : step === 'zoning' && !record?.plan ? <div className={styles.panel}><Alert title={t('adminStoreZoning.planRequired')} /><Button size="md" href={requestPath(id, 'plan')}>{t('adminStorePlan.title')}</Button></div>
      : step === 'zoning' && record ? <StoreZoningStep record={record} onSaved={zoningSaved} onRevision={revision => client.setQueryData(requestKey(userId, record.id), { ...record, revision })} />
      : step === 'review' && record ? <StoreReviewStep record={record} onRevision={revision => client.setQueryData(requestKey(userId, record.id), { ...record, revision })}
        onResult={result => client.setQueryData(requestKey(userId, result.record.id), result.record)} />
      : step !== 'details' ? <div className={styles.panel}><h2>{t(`adminStoreRequest.steps.${step}`)}</h2><Alert title={t('adminStorePlan.requestRequired')} />
        <Button href={requestPath(id)} variant="secondary" size="md">{t('adminStoreRequest.backDetails')}</Button></div>
      : <>
        {notice && <Alert tone={notice === 'saved' ? 'success' : 'warning'} title={t(`adminStoreRequest.${notice}`)} />}
        {record?.status === 'approved' && record.published_store_id && <Button href={storeDetailPath(record.published_store_id)} size="md">{t('adminStoreRequest.openStore')}</Button>}
        <StoreRequestForm key={`${id ?? 'new'}:${record?.revision ?? 0}`} record={record} userId={userId} onSaved={saved} onReload={async () => { await reload(); }} />
      </>}
    {((step !== 'details' && step !== 'review') || !validId || query.isError) && <Button href={STORE_REQUEST_LIST} variant="secondary" size="md">{t('adminStoreRequests.backToList')}</Button>}
  </section>;
}
