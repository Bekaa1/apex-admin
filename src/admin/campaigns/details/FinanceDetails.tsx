import { useState } from 'react';
import { Badge } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatNumber } from '../../../lib/format';
import { overviewDate } from '../../overview/model';
import { fetchInvoices, fetchPortions } from './api';
import { DetailField, DetailQuery, RelatedNavigation } from './DetailState';
import { unitPrice, type CampaignDetail } from './model';
import { useCampaignDetailQuery } from './useCampaignDetail';
import styles from './CampaignDetail.module.css';

function InvoiceList({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(1);
  const query = useCampaignDetailQuery(id, ['invoices', page], (signal) => fetchInvoices(id, page, signal));
  const unknown = t('adminCampaigns.noData');
  const label = t('adminCampaignDetail.invoices');
  return <section className={styles.subsection} aria-label={label} aria-busy={query.isFetching}>
    <h3>{label}</h3>
    <DetailQuery query={query}>{({ rows, count }) => <>
      {rows.length ? <div className={styles.tableWrap} role="region" aria-label={label} tabIndex={0}><table className={styles.table}>
        <caption className={styles.srOnly}>{label}</caption>
        <thead><tr>{['invoiceNumber', 'amount', 'invoiceStatus', 'issuedAt', 'paidAt'].map((key) => <th scope="col" key={key}>{t(`adminCampaignDetail.${key}`)}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td>{row.number === null ? unknown : '№ ' + formatNumber(row.number, lang)}<span className={styles.identifier}>{row.id}</span></td>
          <td>{row.amount === null ? unknown : formatMoney(row.amount, lang)}</td>
          <td><Badge className={styles.status}>{row.status?.trim() || unknown}</Badge></td>
          <td>{overviewDate(row.issued_at, lang, unknown)}</td><td>{overviewDate(row.paid_at, lang, unknown)}</td>
        </tr>)}</tbody>
      </table></div> : <p className={styles.empty}>{t(page > 1 ? 'adminCampaignDetail.pageEmpty' : 'adminCampaignDetail.invoicesEmpty')}</p>}
      <RelatedNavigation page={page} count={count} pending={query.isFetching} onPage={setPage} label={label} />
    </>}</DetailQuery>
  </section>;
}
function PortionList({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(1);
  const query = useCampaignDetailQuery(id, ['portions', page], (signal) => fetchPortions(id, page, signal));
  const unknown = t('adminCampaigns.noData');
  const label = t('adminCampaignDetail.portions');
  return <section className={styles.subsection} aria-label={label} aria-busy={query.isFetching}>
    <h3>{label}</h3>
    <DetailQuery query={query}>{({ rows, count }) => <>
      {rows.length ? <div className={styles.tableWrap} role="region" aria-label={label} tabIndex={0}><table className={styles.table}>
        <caption className={styles.srOnly}>{label}</caption>
        <thead><tr>{['position', 'amount', 'portionSpent', 'pricePerPlay', 'invoiceId'].map((key) => <th scope="col" key={key}>{t(`adminCampaignDetail.${key}`)}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td>{row.position === null ? unknown : formatNumber(row.position, lang)}</td>
          <td>{row.amount === null ? unknown : formatMoney(row.amount, lang)}</td>
          <td>{row.spent === null ? unknown : formatMoney(row.spent, lang)}</td>
          <td>{unitPrice(row.price_per_play, lang, unknown)}</td><td>{row.invoice_id ?? unknown}</td>
        </tr>)}</tbody>
      </table></div> : <p className={styles.empty}>{t(page > 1 ? 'adminCampaignDetail.pageEmpty' : 'adminCampaignDetail.portionsEmpty')}</p>}
      <RelatedNavigation page={page} count={count} pending={query.isFetching} onPage={setPage} label={label} />
    </>}</DetailQuery>
  </section>;
}
export function FinanceDetails({ row }: { row: CampaignDetail }) {
  const { t, lang } = useI18n();
  const money = (value: number | null) => value === null ? t('adminCampaigns.noData') : formatMoney(value, lang);
  return <section className={styles.panel} aria-labelledby="campaign-finance">
    <h2 id="campaign-finance">{t('adminCampaignDetail.finance')}</h2>
    <dl className={styles.fields}>
      <DetailField label={t('adminCampaigns.columns.budget')}>{money(row.budget)}</DetailField>
      <DetailField label={t('adminCampaigns.columns.paid')}>{money(row.paid_amount)}</DetailField>
      <DetailField label={t('adminCampaigns.columns.spent')}>{money(row.spent_budget)}</DetailField>
    </dl>
    <InvoiceList id={row.id} /><PortionList id={row.id} />
  </section>;
}
