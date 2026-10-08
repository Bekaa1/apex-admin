import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, FileDrop } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { failure, RequestFailure } from '../errors';
import { canEdit, requestPath, type StoreRequest } from '../model';
import { EXAMPLE_PLAN, PlanIssue, readPlanFile, sameJson, validatePlan, type PlanDraft } from './model';
import { savePlan, type PlanSaveResult } from './save';
import { PlanPreview } from './PlanPreview';
import { useUnsavedPlan } from './useUnsavedPlan';
import { UnsavedPlanDialog } from './UnsavedPlanDialog';
import shared from '../StoreRequestPage.module.css';
import styles from './StorePlan.module.css';

function initialDraft(record: StoreRequest) {
  try {
    return { draft: record.plan ? { data: validatePlan(record.plan.plan_data), name: record.plan.source_file_name } : null, error: null as PlanIssue | null };
  } catch (error) { return { draft: null, error: error instanceof PlanIssue ? error : new PlanIssue('json') }; }
}
function downloadExample() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(EXAMPLE_PLAN, null, 2)], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'apex-store-plan-example.json';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function StorePlanStep({ record, onSaved, onReload }: {
  record: StoreRequest; onSaved: (result: PlanSaveResult, next: boolean) => void; onReload: () => Promise<StoreRequest>;
}) {
  const { t } = useI18n();
  const [initial] = useState(() => initialDraft(record));
  const [draft, setDraft] = useState<PlanDraft | null>(initial.draft);
  const [formatError, setFormatError] = useState<PlanIssue | null>(initial.error);
  const [issue, setIssue] = useState<RequestFailure | null>(null);
  const [notice, setNotice] = useState<'saved' | 'changed' | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [reading, setReading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(record.plan?.source_file_name ?? '');
  const [touched, setTouched] = useState(false);
  const alive = useRef(true), busy = useRef(false), readSequence = useRef(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const mutation = useMutation({ mutationFn: (value: PlanDraft) => savePlan(record, value), retry: false, networkMode: 'always', gcTime: 0 });
  const pending = mutation.isPending || reading;
  const dirty = touched && (!draft || !sameJson(draft.data, record.plan?.plan_data) || draft.name !== record.plan?.source_file_name);
  const navigation = useUnsavedPlan(dirty, pending);
  const editable = canEdit(record) && !readOnly;
  const blocked = Boolean(issue && ['unresolved', 'forbidden', 'not_found', 'not_authenticated', 'invalid_status'].includes(issue.kind));
  async function choose(file: File) {
    if (!editable || pending || blocked) return;
    const sequence = ++readSequence.current;
    navigation.guard(); setTouched(true); setSelectedFile(file.name); setReading(true); setIssue(null); setNotice(null);
    try {
      const value = await readPlanFile(file);
      if (alive.current && sequence === readSequence.current) { setDraft(value); setFormatError(null); }
    } catch (error) {
      if (alive.current && sequence === readSequence.current) { setDraft(null); setFormatError(error instanceof PlanIssue ? error : new PlanIssue('fileRead')); }
    } finally { if (alive.current && sequence === readSequence.current) setReading(false); }
  }
  function accept(result: PlanSaveResult, next: boolean) {
    setReadOnly(result.readOnly); setNotice(result.outcome); setIssue(null);
    if (result.outcome === 'changed') {
      const loaded = initialDraft(result.record);
      setDraft(loaded.draft); setFormatError(loaded.error); setSelectedFile(result.record.plan?.source_file_name ?? '');
    }
    setTouched(false);
    if (result.outcome === 'saved' && next) navigation.allow();
    onSaved(result, next && result.outcome === 'saved');
  }
  async function save(next: boolean) {
    if (busy.current || pending || blocked || !editable || !draft || formatError) return;
    busy.current = true; setIssue(null); setNotice(null);
    try { const result = await mutation.mutateAsync(draft); if (alive.current) accept(result, next); }
    catch (error) {
      if (!alive.current) return;
      if (error instanceof PlanIssue) setFormatError(error);
      else { const parsed = failure(error); setIssue(parsed); if (parsed.kind === 'invalid_status') setReadOnly(true); }
    } finally { busy.current = false; }
  }
  async function recheck() {
    if (busy.current) return;
    busy.current = true; setReading(true);
    try { const fresh = await onReload(); if (alive.current) accept({ record: fresh, outcome: 'changed', readOnly: !canEdit(fresh) }, false); }
    catch (error) {
      if (alive.current) {
        const parsed = failure(error);
        setIssue(['forbidden', 'not_found', 'not_authenticated'].includes(parsed.kind) ? parsed : new RequestFailure('unresolved'));
      }
    }
    finally { busy.current = false; if (alive.current) setReading(false); }
  }
  return <div className={shared.panel} aria-busy={pending}>
    <h2>{t('adminStorePlan.title')}</h2>
    {!editable && <Alert title={t(record.status === 'pending_owner_approval' ? 'adminStoreRequest.pendingApproval' : record.status === 'approved' ? 'adminStoreRequest.approved' : 'adminStoreRequest.readOnly')} />}
    {record.status === 'rejected' && record.review_comment && <Alert tone="warning" title={t('adminStoreRequest.ownerComment')}><span className={shared.comment}>{record.review_comment}</span></Alert>}
    <p className={styles.filename}>{t('adminStorePlan.fileName')}: {selectedFile || t(record.plan ? 'adminStorePlan.unknownName' : 'adminStorePlan.noFile')}</p>
    {editable && <>
      <p id="store-plan-upload-label">{t('adminStorePlan.upload')}</p>
      <FileDrop accept=".json,application/json" icon="upload" labelledBy="store-plan-upload-label" title={t('adminStorePlan.dropTitle')}
        hint={t('adminStorePlan.dropHint')} buttonLabel={t(selectedFile ? 'adminStorePlan.replace' : 'adminStorePlan.choose')}
        invalid={Boolean(formatError)} disabled={pending || blocked} onFile={file => void choose(file)} />
    </>}
    <div><Button variant="secondary" size="md" onClick={downloadExample}>{t('adminStorePlan.example')}</Button></div>
    {formatError && <Alert tone="danger" title={t('adminStorePlan.formatError')}>
      {t(`adminStorePlan.validation.${formatError.code}`)} {t('adminStorePlan.field')}: {formatError.path}
    </Alert>}
    {issue && <Alert tone="danger" title={t(`adminStorePlan.errors.${issue.kind}`)}>
      {issue.details && <p>{issue.details}</p>}
      {issue.hint ? `${t('adminStorePlan.field')}: ${issue.hint}. ${t(`adminStorePlan.hints.${issue.hint.replaceAll('.', '_')}`)}` : undefined}
    </Alert>}
    {notice && <Alert tone={notice === 'saved' ? 'success' : 'warning'} title={t(`adminStorePlan.${notice}`)} />}
    {draft ? <PlanPreview key={`${draft.name}:${record.revision}`} plan={draft.data} /> : !formatError && <Alert title={t('adminStorePlan.empty')} />}
    <div className={shared.actions}>
      <Button href={requestPath(record.id)} size="md" variant="secondary" disabled={pending}>{t('adminStorePlan.back')}</Button>
      {editable && <>
        <Button size="md" variant="secondary" disabled={pending || blocked || !draft || Boolean(formatError)} onClick={() => void save(false)}>{t('adminStoreRequest.save')}</Button>
        <Button size="md" loading={mutation.isPending} disabled={reading || blocked || !draft || Boolean(formatError)} onClick={() => void save(true)}>{t('adminStoreRequest.saveNext')}</Button>
      </>}
      {issue?.kind === 'unresolved' && <Button size="md" loading={reading} onClick={() => void recheck()}>{t('adminStoreRequest.recheck')}</Button>}
      {issue?.kind === 'not_authenticated' && <Button size="md" href="/login">{t('adminStoreRequest.signIn')}</Button>}
    </div>
    {navigation.blocker.state === 'blocked' && <UnsavedPlanDialog busy={pending} onStay={() => navigation.blocker.reset?.()} onLeave={() => navigation.blocker.proceed?.()} />}
  </div>;
}
