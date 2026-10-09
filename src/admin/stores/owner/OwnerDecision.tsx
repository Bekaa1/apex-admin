import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { storeDetailPath } from '../model';
import { failure, type RequestFailure } from '../onboarding/errors';
import { requestKey, type StoreRequest } from '../onboarding/model';
import { StoreReviewStep } from '../onboarding/review/StoreReviewStep';
import { reviewRequest } from '../onboarding/review/model';
import { canDecide, OWNER_QUEUE, validComment, type Decision, type OwnerList } from './model';
import { decideRequest, readDecision, type DecisionResult } from './decide';
import { DecisionDialog } from './DecisionDialog';
import { adminStatusAlertTone } from '../../statusTone';
import styles from './Owner.module.css';

export function OwnerDecision({ owner, record, userId, onRefresh }: { owner: boolean; record: StoreRequest; userId: string; onRefresh: () => void }) {
  const { t, lang } = useI18n(), client = useQueryClient();
  const [dialog, setDialog] = useState<Decision | null>(null), [comment, setComment] = useState('');
  const [issue, setIssue] = useState<RequestFailure | null>(null), [notice, setNotice] = useState<DecisionResult | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null), [reading, setReading] = useState(false);
  const busy = useRef(false), alive = useRef(true), attempted = useRef<Decision | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const mutation = useMutation({ mutationFn: (decision: Decision) => decideRequest(owner, record, decision, comment, returned => {
    if (!alive.current) return;
    if (returned.storeId) setPublishedId(returned.storeId);
    if (returned.revision) client.setQueryData(requestKey(userId, record.id), { ...record, revision: returned.revision });
  }), retry: false, networkMode: 'always', gcTime: 0 });
  const pending = mutation.isPending || reading;
  const blocked = Boolean(issue && ['unresolved', 'forbidden', 'not_authenticated', 'not_found', 'owner_not_configured'].includes(issue.kind));
  const allowed = canDecide(owner, record), review = reviewRequest(record);
  function accept(result: DecisionResult) {
    setNotice(result); setIssue(null);
    client.setQueryData(requestKey(userId, result.record.id), result.record);
    if (result.record.published_store_id) setPublishedId(result.record.published_store_id);
    if (result.record.status !== 'pending_owner_approval') client.setQueriesData<OwnerList>({ queryKey: ['admin', 'store-owner-queue', userId] }, old => old ? { ...old, rows: old.rows.filter(row => row.id !== record.id) } : old);
    for (const key of ['store-owner-queue', 'store-requests', 'stores']) void client.invalidateQueries({ queryKey: ['admin', key], refetchType: 'none' });
  }
  async function send() {
    if (busy.current || !allowed || blocked || !dialog || (dialog === 'reject' && !validComment(comment))) return;
    busy.current = true; attempted.current = dialog; setIssue(null); setNotice(null);
    try { const result = await mutation.mutateAsync(dialog); if (alive.current) accept(result); }
    catch (error) { if (alive.current) setIssue(failure(error)); }
    finally { busy.current = false; if (alive.current) setDialog(null); }
  }
  async function recheck() {
    if (busy.current || !attempted.current) return;
    busy.current = true; setReading(true);
    try { const result = await readDecision(record.id, attempted.current); if (alive.current) accept(result); }
    catch (error) { if (alive.current) setIssue(failure(error)); }
    finally { busy.current = false; if (alive.current) setReading(false); }
  }
  const date = record.submitted_at && Number.isFinite(Date.parse(record.submitted_at))
    ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Almaty' }).format(new Date(record.submitted_at)) : t('adminStoreRequests.notSpecified');
  return <div className={styles.page} aria-busy={pending}>
    <header className={styles.actions}><h1>{t('adminStoreOwner.reviewTitle')}</h1><Button size="md" variant="secondary" disabled={pending} onClick={onRefresh}>{t('adminStoreRequests.refresh')}</Button></header>
    {issue && <Alert tone="danger" title={t(issue.kind === 'invalid_store' && issue.hint === 'comment' ? 'adminStoreOwner.commentLength' : `adminStoreOwner.errors.${issue.kind}`)}>{issue.details}</Alert>}
    {notice && <Alert tone={notice.outcome === 'approved' || notice.outcome === 'rejected' ? adminStatusAlertTone('storeRequest', notice.outcome) : 'warning'} title={t(['revision_conflict', 'invalid_status', 'already_published'].includes(notice.reason) ? `adminStoreOwner.errors.${notice.reason}` : `adminStoreOwner.results.${notice.outcome}`)} />}
    {pending && <p role="status">{t(reading ? 'adminStoreRequest.loading' : `adminStoreOwner.${dialog ?? 'approve'}Busy`)}</p>}
    <div className={styles.actions}>
      {allowed && <><Button size="md" disabled={pending || blocked} onClick={() => { if (!busy.current) setDialog('approve'); }}>{t('adminStoreOwner.approve')}</Button>
        <Button size="md" variant="secondary" disabled={pending || blocked} onClick={() => { if (!busy.current) setDialog('reject'); }}>{t('adminStoreOwner.reject')}</Button></>}
      {issue?.kind === 'unresolved' && <Button size="md" disabled={pending} onClick={() => void recheck()}>{t('adminStoreRequest.recheck')}</Button>}
      {issue?.kind === 'not_authenticated' && <Button size="md" href="/login">{t('adminStoreRequest.signIn')}</Button>}
      {publishedId && publishedId !== record.published_store_id && <Button size="md" variant="secondary" disabled={pending} href={storeDetailPath(publishedId)}>{t('adminStoreRequest.openStore')}</Button>}
    </div>
    <section className={styles.card}>
      <p>{t('adminStoreOwner.revision')}: {record.revision}</p><p>{t('adminStoreReview.submittedAt')}: {date} · Asia/Almaty</p>
      {record.is_mine && <p>{t('adminStoreRequests.mine')}</p>}
      {record.review_comment && record.status !== 'rejected' && <div className={styles.comment}><strong>{t('adminStoreRequest.ownerComment')}</strong><p>{record.review_comment}</p></div>}
    </section>
    <StoreReviewStep record={record} readOnly externalBusy={pending} backTo={OWNER_QUEUE} onRevision={() => {}} onResult={() => {}} />
    {review.plan && <section className={styles.card} aria-labelledby="owner-assignments"><h2 id="owner-assignments">{t('adminStoreOwner.assignments')}</h2>
      <ul className={styles.assignments} tabIndex={0}>{review.plan.elements.map(element => <li key={element.id}><strong>{element.label || element.id}</strong> · {element.id} · {element.kind} — {review.labels.get(element.id) ?? t('adminStoreZoning.unassigned')}</li>)}</ul>
    </section>}
    {dialog && <DecisionDialog decision={dialog} name={record.name} comment={comment} onComment={setComment} busy={pending} onCancel={() => { if (!busy.current) setDialog(null); }} onConfirm={() => void send()} />}
  </div>;
}
