import { useEffect, useId, useRef, type FormEvent } from 'react';
import { Alert, Button, Checkbox, TextAreaField } from '../../../design-system';
import { useSignOut } from '../../../auth/useSignOut';
import { useI18n } from '../../../i18n/i18n';
import type { DecisionState } from './controller';
import { REASONS, terminalIssue, type Reason } from './model';
import styles from './Moderation.module.css';

interface Props {
  approve: boolean; campaign: string; state: DecisionState; pending: boolean;
  reasons: Reason[]; comment: string;
  onReasons: (reasons: Reason[]) => void; onComment: (comment: string) => void;
  onSubmit: () => void; onRefresh: () => void; onClose: () => void;
}
export function ModerationDialog(props: Props) {
  const { approve, campaign, state, pending, reasons, comment, onReasons, onComment, onSubmit, onRefresh, onClose } = props;
  const { t } = useI18n();
  const signOut = useSignOut();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const title = useId();
  const reasonsError = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>('[data-close]')?.focus();
    return () => { dialog?.close(); (opener?.isConnected ? opener : document.getElementById('campaign-detail-title'))?.focus(); };
  }, []);
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(); };
  const disabled = state.busy || state.succeeded || state.needsRefresh || terminalIssue(state.issue) || !pending;
  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={title}
    onCancel={(event) => { event.preventDefault(); if (!state.busy) onClose(); }}>
    <form onSubmit={submit} className={styles.form} aria-busy={state.busy}>
      <h2 id={title}>{t(approve ? 'adminModeration.approveTitle' : 'adminModeration.rejectTitle')}</h2>
      <p className={styles.campaign}>{campaign}</p>
      {!approve ? <>
        <fieldset disabled={state.busy || state.succeeded} className={styles.reasons} aria-describedby={state.issue === 'invalid_reasons' ? reasonsError : undefined}>
          <legend>{t('adminModeration.reasons')}</legend>
          {REASONS.map(reason => <Checkbox key={reason} checked={reasons.includes(reason)} onChange={(event) => onReasons(event.target.checked ? [...reasons, reason] : reasons.filter(value => value !== reason))}>{t(`adminModeration.reason.${reason}`)}</Checkbox>)}
        </fieldset>
        {state.issue === 'invalid_reasons' ? <p id={reasonsError} className={styles.error} role="alert">{t('adminModeration.errors.invalid_reasons')}</p> : null}
        <TextAreaField label={t('adminModeration.comment')} optional={t('adminModeration.optional')} value={comment} disabled={state.busy || state.succeeded} rows={4} onChange={(event) => onComment(event.target.value)} />
      </> : <p>{t('adminModeration.approveBody')}</p>}
      {state.succeeded ? <Alert tone="success">{t('adminModeration.success')}</Alert> : null}
      {state.issue && state.issue !== 'invalid_reasons' ? <Alert tone="danger">{t(`adminModeration.errors.${state.issue}`)}</Alert> : null}
      {state.reviewed && !state.issue && !state.succeeded ? <Alert tone="info">{t('adminModeration.reviewed')}</Alert> : null}
      {signOut.failed ? <Alert tone="danger">{t('adminModeration.signOutFailed')}</Alert> : null}
      <div className={styles.actions}>
        {state.issue === 'not_authenticated' ? <Button size="md" loading={signOut.pending} onClick={() => { void signOut.signOut(); }}>{t('adminModeration.login')}</Button>
          : state.needsRefresh ? <Button size="md" loading={state.busy} onClick={onRefresh}>{t('adminModeration.checkState')}</Button>
          : !state.succeeded && !terminalIssue(state.issue) ? <Button type="submit" size="md" variant={approve ? 'primary' : 'danger'} loading={state.busy} disabled={disabled}>{t(approve ? 'adminModeration.confirmApprove' : 'adminModeration.confirmReject')}</Button> : null}
        <Button size="md" variant="secondary" data-close disabled={state.busy || signOut.pending} onClick={onClose}>{t(state.succeeded || terminalIssue(state.issue) ? 'adminModeration.close' : 'adminModeration.cancel')}</Button>
      </div>
    </form>
  </dialog>;
}
