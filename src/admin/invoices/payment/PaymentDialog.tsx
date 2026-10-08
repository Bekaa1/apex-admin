import { useEffect, useId, useRef } from 'react';
import { Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { unitPrice } from '../../campaigns/details/model';
import type { PaymentSummary } from '../details/model';
import type { PaymentState } from './controller';
import { PaymentFeedback } from './PaymentFeedback';
import styles from '../../campaigns/moderation/Moderation.module.css';
import local from '../details/InvoiceDetail.module.css';

export function PaymentDialog({ summary, state, current, onConfirm, onRefresh, onClose }: {
  summary: PaymentSummary; state: PaymentState; current: boolean;
  onConfirm: () => void; onRefresh: () => void; onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  const description = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>('[data-close]')?.focus();
    return () => { dialog?.close(); (opener?.isConnected ? opener : document.getElementById('invoice-detail-title'))?.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={title} aria-describedby={description}
    onCancel={event => { event.preventDefault(); if (!state.busy) onClose(); }}>
    <div className={styles.form} aria-busy={state.busy}>
      <h2 id={title}>{t('adminInvoiceDetail.confirmTitle')}</h2><p id={description}>{t('adminInvoiceDetail.confirmBody')}</p>
      <dl className={local.summary}>
        <div><dt>{t('adminInvoices.columns.number')}</dt><dd>{summary.number === null ? t('adminInvoices.noData') : `№ ${summary.number}`}</dd></div>
        <div><dt>{t('adminInvoices.columns.advertiser')}</dt><dd>{summary.client}{summary.client !== summary.user_id ? <span className={local.identifier}>{summary.user_id}</span> : null}</dd></div>
        <div><dt>{t('adminInvoices.columns.campaign')}</dt><dd>{summary.campaign}{summary.campaign !== summary.ad_id ? <span className={local.identifier}>{summary.ad_id}</span> : null}</dd></div>
        <div><dt>{t('adminInvoices.columns.amount')}</dt><dd className={local.amount}>{unitPrice(summary.amount, lang, t('adminInvoices.noData'))}</dd></div>
      </dl>
      {!current && !state.attempted ? <p role="alert">{t('adminInvoiceDetail.errors.changed')}</p> : null}
      <PaymentFeedback state={state} onRefresh={onRefresh} />
      <div className={styles.actions}>
        {!state.attempted && !state.verified ? <Button size="md" disabled={!current || state.busy || state.issue !== null} onClick={onConfirm}>{t('adminInvoiceDetail.confirm')}</Button> : null}
        <Button size="md" variant="secondary" data-close disabled={state.busy} onClick={onClose}>{t(state.attempted ? 'adminInvoiceDetail.close' : 'adminInvoiceDetail.cancel')}</Button>
      </div>
    </div>
  </dialog>;
}
