import { useEffect, useId, useRef } from 'react';
import { Button } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import styles from './StorePlan.module.css';

export function UnsavedPlanDialog({ busy, onStay, onLeave, scope = 'adminStorePlan' }: { busy: boolean; onStay: () => void; onLeave: () => void; scope?: 'adminStoreRequest' | 'adminStorePlan' | 'adminStoreZoning' | 'adminStoreReview' }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal(); dialog?.querySelector<HTMLButtonElement>('[data-stay]')?.focus();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); onStay(); }}>
    <h2 id={title}>{t(`${scope}.unsavedTitle`)}</h2>
    <p>{t(busy ? 'adminStorePlan.wait' : `${scope}.unsavedBody`)}</p>
    <div className={styles.controls}>
      <Button size="md" data-stay onClick={onStay}>{t('adminStorePlan.stay')}</Button>
      <Button size="md" variant="secondary" disabled={busy} onClick={onLeave}>{t('adminStorePlan.leave')}</Button>
    </div>
  </dialog>;
}
