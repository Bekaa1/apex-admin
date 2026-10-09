import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { Alert, Button } from '../../../design-system';
import { useAuthSession } from '../../../auth/useAuthSession';
import { useI18n } from '../../../i18n/i18n';
import { listReturnTo } from '../../../navigation/returnTo';
import { OverviewLoading } from '../../overview/OverviewState';
import { InvoiceReadError } from '../api';
import { INVOICE_LIST, isInvoiceId } from '../model';
import { PaymentDialog } from '../payment/PaymentDialog';
import { PaymentFeedback } from '../payment/PaymentFeedback';
import { usePayment } from '../payment/usePayment';
import { fetchInvoiceDetail } from './api';
import { InvoiceFields } from './InvoiceFields';
import { matchesReview, type PaymentSummary } from './model';
import { useInvoiceDetailQuery } from './useInvoiceDetail';
import { ConfirmChange } from '../../roles/ConfirmChange';
import { useStatusOperation } from '../../roles/useStatusOperation';
import { unitPrice } from '../../campaigns/details/model';
import styles from '../../campaigns/details/CampaignDetail.module.css';

function InvoiceContent({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const query = useInvoiceDetailQuery(id, ['record'], signal => fetchInvoiceDetail(id, signal));
  const { state, controller } = usePayment(id);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const cancellation = useStatusOperation('invoice', id);
  const [cancelSummary, setCancelSummary] = useState<PaymentSummary | null>(null);
  const checkPayment = () => { void controller.refresh(); };
  const refresh = () => { if (state.attempted) checkPayment(); else void query.refetch(); };
  const issue = query.error instanceof InvoiceReadError ? query.error.kind : 'unavailable';
  return <>
    {cancellation.state.issue ? <Alert tone="danger" action={<Button size="md" loading={cancellation.state.busy} onClick={() => { void cancellation.refresh(); }}>{t('roles.refresh')}</Button>}>{t(`adminModeration.errors.${cancellation.state.issue}`)}</Alert> : null}
    {cancellation.state.saved ? <Alert tone="success">{t('roles.saved')}</Alert> : null}
    {!summary && (state.attempted || state.issue) ? <PaymentFeedback state={state} onRefresh={checkPayment} /> : null}
    {query.isPending ? <OverviewLoading /> : query.isError ? <Alert tone="danger" title={t(issue === 'denied' ? 'adminInvoices.deniedTitle' : 'adminInvoiceDetail.loadError')}
      action={<Button size="md" variant="secondary" loading={state.busy || query.isFetching} onClick={refresh}>{t('cabinet.retry')}</Button>}>{t(`adminInvoices.errors.${issue}`)}</Alert>
      : query.data === null ? <Alert title={t('adminInvoiceDetail.notFound')}>{t('adminInvoiceDetail.notFoundBody')}</Alert>
        : <>
          <div className={styles.actions}><Button size="md" variant="secondary" loading={state.busy || query.isFetching} onClick={refresh}>{t('adminInvoices.refresh')}</Button></div>
          <InvoiceFields row={query.data} canOpen={!query.isFetching && !state.busy && !state.attempted && !state.verified && !cancellation.state.busy && !cancellation.state.blocked && !summary && !cancelSummary}
            onOpen={value => { controller.review(); setSummary(value); }} onCancel={setCancelSummary} />
        </>}
    {summary ? <PaymentDialog summary={summary} state={state} current={!query.isError && !query.isFetching && matchesReview(query.data, summary)}
      onConfirm={() => { void controller.submit(summary); }} onRefresh={checkPayment} onClose={() => setSummary(null)} /> : null}
    {cancelSummary ? <ConfirmChange title={t('roles.cancelInvoice')} busy={cancellation.state.busy}
      onClose={() => setCancelSummary(null)} onConfirm={() => {
        if (!state.busy && !state.attempted && !summary && matchesReview(query.data, cancelSummary)) void cancellation.submit('cancelInvoice').finally(() => setCancelSummary(null));
        else setCancelSummary(null);
      }}><p>№ {cancelSummary.number} · {cancelSummary.client}</p><p>{cancelSummary.campaign}</p><p>{unitPrice(cancelSummary.amount, lang, t('roles.notSpecified'))}</p><p>{t('roles.cancelInvoiceConfirm')}</p></ConfirmChange> : null}
  </>;
}

export function InvoiceDetailPage() {
  const { id: raw } = useParams();
  const id = raw?.toLowerCase();
  const { state } = useLocation();
  const { session } = useAuthSession();
  const { t } = useI18n();
  return <section className={styles.page} aria-labelledby="invoice-detail-title">
    <div><Button href={listReturnTo(state, INVOICE_LIST)} variant="ghost" size="md" iconLeft="arrow-left">{t('adminInvoices.detail.back')}</Button></div>
    <header><h1 id="invoice-detail-title" tabIndex={-1}>{t('adminInvoices.detail.title')}</h1><p className={styles.muted}>{t('adminInvoiceDetail.description')}</p></header>
    {isInvoiceId(id) ? <InvoiceContent key={`${session?.user.id}:${session?.expires_at}:${id}`} id={id} /> : <Alert tone="danger">{t('adminInvoices.detail.invalid')}</Alert>}
  </section>;
}
