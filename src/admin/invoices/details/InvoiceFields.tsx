import { Link } from 'react-router';
import { Alert, Badge, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { overviewDate } from '../../overview/model';
import { DetailField } from '../../campaigns/details/DetailState';
import { unitPrice } from '../../campaigns/details/model';
import { fetchInvoiceNames } from '../api';
import { invoiceKind, invoiceStatus } from '../model';
import { canReviewPayment, invoiceFileUrl, type InvoiceDetail, type PaymentSummary } from './model';
import { useInvoiceDetailQuery } from './useInvoiceDetail';
import styles from '../../campaigns/details/CampaignDetail.module.css';
import local from './InvoiceDetail.module.css';

export function InvoiceFields({ row, canOpen, onOpen }: { row: InvoiceDetail; canOpen: boolean; onOpen: (summary: PaymentSummary) => void }) {
  const { t, lang } = useI18n();
  const names = useInvoiceDetailQuery(row.id, ['names', row.user_id, row.ad_id], signal => fetchInvoiceNames([row.user_id], [row.ad_id], signal));
  const available = !names.isError && !names.isPending ? names.data : undefined;
  const client = available?.users.names.get(row.user_id) || row.user_id;
  const campaign = available?.ads.names.get(row.ad_id) || row.ad_id;
  const unknown = t('adminInvoices.noData');
  const status = invoiceStatus(row.status);
  const kind = invoiceKind(row.kind);
  const file = invoiceFileUrl(row.file_url);
  const namesMissing = names.isError || available?.users.unavailable || available?.ads.unavailable;
  return <section className={styles.panel} aria-label={t('adminInvoiceDetail.basic')}>
    <h2>{t('adminInvoiceDetail.basic')}</h2>
    <dl className={styles.fields}>
      <DetailField label={t('adminInvoices.columns.number')}>{row.number === null ? unknown : `№ ${row.number}`}</DetailField>
      <DetailField label={t('adminInvoices.columns.status')}><Badge className={styles.status} tone={status.tone}>{status.key ? t(status.key) : status.raw}</Badge></DetailField>
      <DetailField label={t('adminInvoices.columns.kind')}><Badge className={styles.status} tone="neutral">{kind.key ? t(kind.key) : kind.raw}</Badge></DetailField>
      <DetailField label={t('adminInvoices.columns.amount')}>{unitPrice(row.amount, lang, unknown)}</DetailField>
      <DetailField label={t('adminInvoices.columns.advertiser')}>{client}{client !== row.user_id ? <span className={styles.identifier}>{row.user_id}</span> : null}</DetailField>
      <DetailField label={t('adminInvoices.columns.campaign')}><Link className={local.link} to={`/admin/campaigns/${row.ad_id}`}>{campaign}</Link>{campaign !== row.ad_id ? <span className={styles.identifier}>{row.ad_id}</span> : null}</DetailField>
      <DetailField label={t('adminInvoices.columns.issued')}>{overviewDate(row.issued_at, lang, unknown)}</DetailField>
      <DetailField label={t('adminInvoices.columns.paid')}>{overviewDate(row.paid_at, lang, unknown)}</DetailField>
      <DetailField label={t('adminInvoiceDetail.recipient')}>{row.sent_to?.trim() || unknown}</DetailField>
      <DetailField label={t('adminInvoiceDetail.paidBy')}>{row.paid_by?.trim() || unknown}</DetailField>
      <DetailField label={t('adminInvoiceDetail.price')}>{unitPrice(row.price_per_play, lang, unknown)}</DetailField>
      <DetailField label={t('adminInvoiceDetail.tariffVersion')}>{row.tariff_version === null ? unknown : String(row.tariff_version)}</DetailField>
    </dl>
    {names.isPending ? <p className={styles.muted} role="status">{t('adminInvoiceDetail.loadingNames')}</p> : null}
    {namesMissing ? <Alert tone="info" action={<Button size="md" variant="secondary" loading={names.isFetching} onClick={() => { void names.refetch(); }}>{t('cabinet.retry')}</Button>}>{t('adminInvoiceDetail.namesUnavailable')}</Alert> : null}
    <div>{file ? <a className={local.link} href={file} target="_blank" rel="noopener noreferrer">{t('adminInvoiceDetail.openFile')}</a>
      : <p className={styles.muted}>{t(row.file_url?.trim() ? 'adminInvoiceDetail.invalidFile' : 'adminInvoiceDetail.noFile')}</p>}</div>
    {row.status === 'unpaid' ? <div className={styles.actions}>
      <Button size="md" disabled={!canOpen || !canReviewPayment(row)} onClick={() => onOpen({ id: row.id, number: row.number, amount: row.amount, user_id: row.user_id, ad_id: row.ad_id, client, campaign })}>{t('adminInvoiceDetail.pay')}</Button>
      {!canReviewPayment(row) ? <p className={styles.muted}>{t('adminInvoiceDetail.incomplete')}</p> : null}
    </div> : null}
  </section>;
}
