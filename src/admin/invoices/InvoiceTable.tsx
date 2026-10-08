import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Badge } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney } from '../../lib/format';
import { overviewDate } from '../overview/model';
import { INVOICE_LIST, invoiceKind, invoiceStatus, type InvoiceItem } from './model';
import styles from '../campaigns/CampaignsPage.module.css';
import invoiceStyles from './InvoicesPage.module.css';

export function InvoiceTable({ rows }: { rows: InvoiceItem[] }) {
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const state = { returnTo: location.pathname + location.search };
  const noData = t('adminInvoices.noData');
  const openRow = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      || (event.target instanceof Element && event.target.closest('a,button,input')) || window.getSelection()?.toString()) return;
    void navigate(`${INVOICE_LIST}/${id}`, { state });
  };
  return <div className={styles.tableWrap} role="region" aria-label={t('adminInvoices.title')} tabIndex={0}>
    <table className={`${styles.table} ${invoiceStyles.table}`}>
      <caption className={styles.srOnly}>{t('adminInvoices.title')}</caption>
      <thead><tr>{['number', 'advertiser', 'campaign', 'kind', 'amount', 'status', 'issued', 'paid'].map(key => <th scope="col" key={key}>{t(`adminInvoices.columns.${key}`)}</th>)}</tr></thead>
      <tbody>{rows.map(row => {
        const status = invoiceStatus(row.status);
        const kind = invoiceKind(row.kind);
        return <tr key={row.id} onClick={event => openRow(event, row.id)}>
          <td><Link className={styles.nameLink} to={`${INVOICE_LIST}/${row.id}`} state={state}>{row.number === null ? noData : `№ ${row.number}`}</Link></td>
          <td>{row.advertiser || row.user_id}</td><td>{row.campaign || row.ad_id}</td>
          <td><Badge tone="neutral" className={styles.status}>{kind.key ? t(kind.key) : kind.raw}</Badge></td>
          <td>{row.amount === null ? noData : formatMoney(row.amount, lang)}</td>
          <td><Badge tone={status.tone} className={styles.status}>{status.key ? t(status.key) : status.raw}</Badge></td>
          <td>{overviewDate(row.issued_at, lang, noData)}</td><td>{overviewDate(row.paid_at, lang, noData)}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
