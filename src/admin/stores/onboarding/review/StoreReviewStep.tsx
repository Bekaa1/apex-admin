import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { storeDetailPath } from '../../model';
import { canEdit, FIELDS, requestPath, STORE_REQUEST_LIST, type StoreRequest } from '../model';
import { failure, type RequestFailure } from '../errors';
import { PlanPreview } from '../plan/PlanPreview';
import { useUnsavedPlan } from '../plan/useUnsavedPlan';
import { UnsavedPlanDialog } from '../plan/UnsavedPlanDialog';
import { errorStep, reviewRequest } from './model';
import { readSubmission, submitReviewed, type SubmitResult } from './submit';
import { SubmitDialog } from './SubmitDialog';
import shared from '../StoreRequestPage.module.css';
import styles from './Review.module.css';

export function StoreReviewStep({ record, onRevision, onResult, readOnly = false, externalBusy = false, backTo = STORE_REQUEST_LIST }: {
  record: StoreRequest; onRevision: (revision: number) => void; onResult: (result: SubmitResult) => void;
  readOnly?: boolean; externalBusy?: boolean; backTo?: string;
}) {
  const { t, lang } = useI18n();
  const [confirm, setConfirm] = useState(false), [reading, setReading] = useState(false);
  const [issue, setIssue] = useState<RequestFailure | null>(null), [notice, setNotice] = useState<SubmitResult | null>(null);
  const busy = useRef(false), alive = useRef(true), attempt = useRef<StoreRequest | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const mutation = useMutation({ mutationFn: () => submitReviewed(record, revision => { if (alive.current) onRevision(revision); }), retry: false, networkMode: 'always', gcTime: 0 });
  const pending = mutation.isPending || reading || externalBusy;
  const navigation = useUnsavedPlan(false, pending);
  const editable = !readOnly && canEdit(record), review = reviewRequest(record);
  const blocked = Boolean(issue && ['unresolved', 'forbidden', 'not_found', 'not_authenticated'].includes(issue.kind));
  const disabled = !editable || !review.valid || pending || blocked;
  function accept(result: SubmitResult) { setNotice(result); setIssue(null); onResult(result); }
  async function send() {
    if (busy.current || disabled || !confirm) return;
    busy.current = true; attempt.current = record; setIssue(null); setNotice(null);
    try { const result = await mutation.mutateAsync(); if (alive.current) accept(result); }
    catch (error) { if (alive.current) setIssue(failure(error)); }
    finally { busy.current = false; if (alive.current) setConfirm(false); }
  }
  async function recheck() {
    if (busy.current || !attempt.current) return;
    busy.current = true; setReading(true);
    try { const result = await readSubmission(attempt.current); if (alive.current) accept(result); }
    catch (error) { if (alive.current) setIssue(failure(error)); }
    finally { busy.current = false; if (alive.current) setReading(false); }
  }
  const destination = issue ? errorStep(issue.kind) : null;
  const submittedDate = record.submitted_at ? new Date(record.submitted_at) : null;
  const dateText = submittedDate && Number.isFinite(submittedDate.getTime())
    ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Almaty' }).format(submittedDate) + ' · Asia/Almaty'
    : t('adminStoreReview.notSpecified');
  return <div className={styles.stack} aria-busy={pending}>
    <h2>{t(readOnly ? 'adminStoreOwner.summary' : 'adminStoreReview.title')}</h2>
    {notice && <Alert tone={notice.outcome === 'submitted' ? 'success' : 'warning'} title={t(notice.outcome === 'changed' && ['revision_conflict', 'invalid_status'].includes(notice.reason)
      ? `adminStoreReview.errors.${notice.reason}` : `adminStoreReview.${notice.outcome}`)} />}
    {issue && <Alert tone="danger" title={t(`adminStoreReview.errors.${issue.kind}`)}
      action={destination && editable ? <Button size="md" href={requestPath(record.id, destination)} disabled={pending}>{t(`adminStoreRequest.steps.${destination}`)}</Button> : undefined}>
      {issue.field ? t(`adminStoreRequest.fields.${issue.field}`) : issue.hint}
      {issue.details && <p>{issue.details}</p>}
    </Alert>}
    {pending && !readOnly && <p role="status">{t(reading ? 'adminStoreRequest.loading' : 'adminStoreReview.sending')}</p>}
    <div className={styles.summary}>
      <section className={shared.panel} aria-labelledby="review-details">
        <h2 id="review-details">{t('adminStoreRequest.steps.details')}</h2>
        <dl className={styles.data}>{FIELDS.map(field => <div key={field}><dt>{t(`adminStoreRequest.fields.${field}`)}</dt><dd>{record[field].trim() || t('adminStoreReview.notSpecified')}</dd></div>)}</dl>
        {editable && <Button size="md" variant="secondary" disabled={pending || blocked} href={requestPath(record.id)}>{t('adminStoreReview.edit')}</Button>}
      </section>
      <section className={shared.panel} aria-labelledby="review-status">
        <h2 id="review-status">{t('adminStoreReview.status')}</h2>
        <p>{['inactive', 'rejected', 'pending_owner_approval', 'approved'].includes(record.status) ? t(`adminStoreReview.statuses.${record.status}`) : record.status}</p>
        {!editable && <p>{t('adminStoreRequest.readOnly')}</p>}
        {record.status === 'rejected' && <Alert tone="warning" title={t('adminStoreRequest.ownerComment')}><span className={shared.comment}>{record.review_comment || t('adminStoreRequest.noComment')}</span></Alert>}
        {record.status === 'pending_owner_approval' && <><Alert title={t('adminStoreReview.awaiting')} /><p>{t('adminStoreReview.submittedAt')}: {dateText}</p></>}
        {record.status === 'approved' && <><Alert tone="success" title={t('adminStoreReview.approved')} />{record.published_store_id && <Button size="md" href={storeDetailPath(record.published_store_id)}>{t('adminStoreRequest.openStore')}</Button>}</>}
      </section>
      <section className={shared.panel} aria-labelledby="review-plan">
        <h2 id="review-plan">{t('adminStoreRequest.steps.plan')}</h2>
        <p className={styles.wrap}>{t('adminStoreReview.file')}: {record.plan?.source_file_name || t('adminStoreReview.notSpecified')}</p>
        {review.plan ? <PlanPreview plan={review.plan} compact /> : <Alert tone="warning" title={t('adminStoreReview.errors.invalid_plan')} />}
        {editable && <Button size="md" variant="secondary" disabled={pending || blocked} href={requestPath(record.id, 'plan')}>{t('adminStoreReview.edit')}</Button>}
      </section>
      <section className={shared.panel} aria-labelledby="review-zoning">
        <h2 id="review-zoning">{t('adminStoreRequest.steps.zoning')}</h2>
        {!review.zonesValid && <Alert tone="danger" title={t('adminStoreReview.errors.invalid_zones')} />}
        {review.zones.length > 0 ? <ul className={styles.zones}>{review.zones.map(zone => <li key={zone.id}>
          <span className={styles.swatch} style={{ backgroundColor: zone.color }} aria-hidden="true" />
          <span>{zone.name} · {t('adminStoreReview.assigned', { count: review.counts.get(zone.id)?.size ?? 0 })}</span>
        </li>)}</ul> : <p>{t('adminStoreReview.noZones')}</p>}
        <p>{t('adminStoreReview.unassigned', { count: review.unassigned ?? '—' })}</p>
        <p>{t('adminStoreZoning.unassignedHint')}</p>
        {review.plan && <PlanPreview plan={review.plan} compact coloring={{ colors: review.colors, labels: review.labels, unassigned: t('adminStoreZoning.unassigned') }} />}
        {editable && <Button size="md" variant="secondary" disabled={pending || blocked} href={requestPath(record.id, 'zoning')}>{t('adminStoreReview.edit')}</Button>}
      </section>
    </div>
    <section className={shared.panel} aria-labelledby="review-checks">
      <h2 id="review-checks">{t(readOnly ? 'adminStoreOwner.checklist' : 'adminStoreReview.checklist')}</h2>
      <p>{t('adminStoreReview.serverRules')}</p>
      <ul className={styles.checks}>{review.checks.map(check => <li key={check.key} data-valid={check.valid}>
        <span aria-label={t(check.valid ? 'adminStoreReview.passed' : 'adminStoreReview.failed')}>{check.valid ? '✓' : '!'}</span>
        <span>{t(`adminStoreReview.checks.${check.key}`)}</span>
        {!check.valid && editable && <Button size="md" variant="secondary" disabled={pending || blocked} href={requestPath(record.id, check.step)}>{t(`adminStoreRequest.steps.${check.step}`)}</Button>}
      </li>)}</ul>
    </section>
    <div className={shared.actions}>
      {editable && <><Button size="md" variant="secondary" disabled={pending || blocked} href={requestPath(record.id, 'zoning')}>{t('adminStorePlan.back')}</Button>
        <Button size="md" disabled={disabled} onClick={() => { if (!busy.current && !disabled) setConfirm(true); }}>{t('adminStoreReview.submit')}</Button></>}
      {issue?.kind === 'unresolved' && <Button size="md" disabled={pending} loading={reading} onClick={() => void recheck()}>{t('adminStoreRequest.recheck')}</Button>}
      {issue?.kind === 'not_authenticated' && <Button size="md" href="/login">{t('adminStoreRequest.signIn')}</Button>}
      <Button size="md" variant="secondary" disabled={pending} href={backTo}>{t('adminStoreRequests.backToList')}</Button>
    </div>
    {confirm && <SubmitDialog name={record.name} busy={pending} onCancel={() => { if (!busy.current) setConfirm(false); }} onConfirm={() => void send()} />}
    {navigation.blocker.state === 'blocked' && <UnsavedPlanDialog scope="adminStoreReview" busy={pending} onStay={() => navigation.blocker.reset?.()} onLeave={() => navigation.blocker.proceed?.()} />}
  </div>;
}
