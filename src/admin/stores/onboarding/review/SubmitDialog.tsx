import { useEffect, useId, useRef } from 'react';
import { Button } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import styles from '../plan/StorePlan.module.css';
import reviewStyles from './Review.module.css';

export function SubmitDialog({ name, busy, onCancel, onConfirm }: {
  name: string; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const { t } = useI18n(), title = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal(); dialog?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={`${styles.dialog} ${reviewStyles.confirmation}`} aria-labelledby={title} aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id={title}>{t('adminStoreReview.confirmTitle')}</h2>
    <p style={{ overflowWrap: 'anywhere' }}>{name}</p>
    <p>{t('adminStoreReview.confirmBody')}</p>
    <p>{t('adminStoreReview.production')}</p>
    <p role="status">{t(busy ? 'adminStoreReview.sending' : 'adminStoreReview.noRepeat')}</p>
    <div className={styles.controls}>
      <Button data-cancel size="md" variant="secondary" disabled={busy} onClick={onCancel}>{t('adminStoreRequest.cancel')}</Button>
      <Button size="md" loading={busy} disabled={busy} onClick={onConfirm}>{t('adminStoreReview.submit')}</Button>
    </div>
  </dialog>;
}
