import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigate } from 'react-router';
import { Alert, Button, TextField } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { createAttemptStore } from './attempt';
import { failure, type RequestFailure } from './errors';
import { canEdit, EMPTY_FIELDS, FIELDS, requestPath, sameFields, STORE_REQUEST_LIST, trimmed, validate, type FieldErrors, type StoreFields, type StoreRequest } from './model';
import { useUnsavedPlan } from './plan/useUnsavedPlan';
import { UnsavedPlanDialog } from './plan/UnsavedPlanDialog';
import { saveDetails, type SaveResult } from './save';
import styles from './StoreRequestPage.module.css';

export function StoreRequestForm({ record, userId, onSaved, onReload }: {
  record: StoreRequest | null; userId: string;
  onSaved: (result: SaveResult, next: boolean) => void; onReload: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [attempts] = useState(() => createAttemptStore(userId, {
    getItem: key => window.sessionStorage.getItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
    removeItem: key => window.sessionStorage.removeItem(key),
  }, () => crypto.randomUUID()));
  const [initial] = useState(() => {
    try {
      const attempt = record ? null : attempts.read();
      return { values: record ?? attempt?.values ?? EMPTY_FIELDS, uncertain: attempt?.uncertain ?? false, requestId: attempt?.requestId, error: null as RequestFailure | null };
    } catch (error) { return { values: record ?? EMPTY_FIELDS, uncertain: false, error: failure(error) }; }
  });
  const [values, setValues] = useState<StoreFields>(initial.values);
  const [uncertain, setUncertain] = useState(initial.uncertain);
  const [issue, setIssue] = useState<RequestFailure | null>(initial.error);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [checking, setChecking] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const mutation = useMutation({ mutationFn: (fields: StoreFields) => saveDetails(record, fields, attempts), retry: false, networkMode: 'always', gcTime: 0 });
  const editable = !record || canEdit(record);
  const blocked = issue && ['unresolved', 'forbidden', 'not_authenticated', 'not_found', 'storage'].includes(issue.kind);
  const pending = mutation.isPending || checking;
  const navigation = useUnsavedPlan(!initial.requestId && editable && !sameFields(values, record ?? EMPTY_FIELDS), pending);
  function focusError(fieldErrors: FieldErrors) {
    const first = FIELDS.find(field => fieldErrors[field]);
    if (first) document.getElementById(`store-request-${first}`)?.focus();
  }
  async function submit(next: boolean) {
    if (busy.current || !editable || blocked) return;
    const nextErrors = validate(values, next);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusError(nextErrors); return; }
    busy.current = true;
    setIssue(null);
    try {
      const result = await mutation.mutateAsync(trimmed(values));
      if (alive.current) { if (result.outcome === 'saved') navigation.allow(); onSaved(result, next); }
    } catch (error) {
      if (!alive.current) return;
      const parsed = failure(error);
      setIssue(parsed);
      if (parsed.kind === 'invalid_store' && parsed.field) {
        const fieldErrors = { [parsed.field]: 'serverField' };
        setErrors(fieldErrors); focusError(fieldErrors);
      }
      if (!record) { try { setUncertain(attempts.read()?.uncertain ?? false); } catch { /* storage issue is already visible */ } }
    } finally { busy.current = false; }
  }
  async function recheck() {
    if (busy.current) return;
    busy.current = true; setChecking(true);
    try { await onReload(); if (alive.current) setIssue(null); }
    catch (error) { if (alive.current) setIssue(failure(error)); }
    finally { busy.current = false; if (alive.current) setChecking(false); }
  }
  function handleSubmit(event: FormEvent) { event.preventDefault(); void submit(true); }
  if (initial.requestId) return <Navigate to={requestPath(initial.requestId)} replace />;
  return <form noValidate onSubmit={handleSubmit} className={styles.panel} aria-busy={pending}>
    <h2>{t('adminStoreRequest.steps.details')}</h2>
    {record && !editable && <Alert title={t(`adminStoreRequest.${record.status === 'pending_owner_approval' ? 'pendingApproval' : record.status === 'approved' ? 'approved' : 'readOnly'}`)} />}
    {record?.status === 'rejected' && <Alert tone="warning" title={t('adminStoreRequest.ownerComment')}>
      <span className={styles.comment}>{record.review_comment || t('adminStoreRequest.noComment')}</span>
    </Alert>}
    {uncertain && <Alert tone="warning" title={t('adminStoreRequest.uncertainCreate')} />}
    <div className={styles.fields}>
      {FIELDS.map(field => <TextField key={field} id={`store-request-${field}`} name={field}
        label={t(`adminStoreRequest.fields.${field}`)} value={values[field]}
        required={field === 'name' || field === 'timezone'}
        maxLength={field === 'name' ? 120 : field === 'city' ? 80 : field === 'address' ? 200 : undefined}
        hint={field === 'city' || field === 'address' ? t('adminStoreRequest.requiredNext') : undefined}
        readOnly={!editable || uncertain || Boolean(blocked)} disabled={pending}
        error={errors[field] ? t(`adminStoreRequest.errors.${errors[field]}`) : undefined}
        onChange={event => { navigation.guard(); setValues({ ...values, [field]: event.target.value }); setErrors({ ...errors, [field]: undefined }); }} />)}
    </div>
    {issue && <Alert tone="danger" title={t(`adminStoreRequest.errors.${issue.kind}`)}
      action={issue.kind === 'not_authenticated' ? <Button href="/login" size="md">{t('adminStoreRequest.signIn')}</Button> : undefined}>{issue.details}</Alert>}
    <div className={styles.actions}>
      <Button href={STORE_REQUEST_LIST} variant="secondary" size="md" disabled={pending}>{t('adminStoreRequest.cancel')}</Button>
      {editable && <>
        <Button variant="secondary" size="md" disabled={pending || Boolean(blocked)} onClick={() => void submit(false)}>{t('adminStoreRequest.save')}</Button>
        <Button type="submit" size="md" loading={mutation.isPending} disabled={checking || Boolean(blocked)}>{t('adminStoreRequest.saveNext')}</Button>
      </>}
      {issue?.kind === 'unresolved' && <Button size="md" onClick={() => void recheck()} loading={checking}>{t('adminStoreRequest.recheck')}</Button>}
    </div>
    {navigation.blocker.state === 'blocked' && <UnsavedPlanDialog scope="adminStoreRequest" busy={pending} onStay={() => navigation.blocker.reset?.()} onLeave={() => navigation.blocker.proceed?.()} />}
  </form>;
}
