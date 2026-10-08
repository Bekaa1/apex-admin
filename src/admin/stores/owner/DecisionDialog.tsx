import { useEffect, useId, useRef } from 'react';
import { Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { validComment, type Decision } from './model';
import styles from './Owner.module.css';

export function DecisionDialog({ decision, name, comment, busy, onComment, onCancel, onConfirm }: {
  decision: Decision; name: string; comment: string; busy: boolean;
  onComment: (value: string) => void; onCancel: () => void; onConfirm: () => void;
}) {
  const { t } = useI18n(), title = useId(), hint = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal(); dialog?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={title} aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id={title}>{t(`adminStoreOwner.${decision}`)}</h2><p>{name}</p>
    <p>{t(`adminStoreOwner.${decision}Warning`)}</p>
    {decision === 'reject' && <label className={styles.field}>{t('adminStoreOwner.comment')}
      <textarea value={comment} disabled={busy} rows={5} required aria-describedby={hint} aria-invalid={!validComment(comment)} onChange={event => onComment(event.target.value)} />
      <span id={hint}>{t('adminStoreOwner.commentLength')}</span>
    </label>}
    <p role="status">{t(busy ? `adminStoreOwner.${decision}Busy` : 'adminStoreOwner.noRepeat')}</p>
    <div className={styles.actions}>
      <Button data-cancel size="md" variant="secondary" disabled={busy} onClick={onCancel}>{t('adminStoreRequest.cancel')}</Button>
      <Button size="md" loading={busy} disabled={busy || decision === 'reject' && !validComment(comment)} onClick={onConfirm}>{t(`adminStoreOwner.${decision}`)}</Button>
    </div>
  </dialog>;
}
