import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import styles from './Roles.module.css';

export function ConfirmChange({ title, children, busy, onConfirm, onClose }: { title: string; children: ReactNode; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  const { t } = useI18n(), id = useId(), dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current, opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    node?.showModal(); node?.querySelector<HTMLElement>('[data-safe]')?.focus();
    return () => { node?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog className={styles.dialog} ref={dialog} aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.form} aria-busy={busy}><h2 id={id}>{title}</h2>{children}<div className={styles.actions}>
      <Button size="md" variant="secondary" data-safe disabled={busy} onClick={onClose}>{t('roles.cancel')}</Button>
      <Button size="md" loading={busy} onClick={onConfirm}>{t('roles.confirm')}</Button>
    </div></div>
  </dialog>;
}
