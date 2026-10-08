import { Link, useLocation, useNavigate } from 'react-router';
import type { MouseEvent } from 'react';
import { Badge } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney, formatNumber } from '../../lib/format';
import { overviewDate } from '../overview/model';
import { CAMPAIGN_LIST, campaignStatus, type CampaignItem } from './model';
import styles from './CampaignsPage.module.css';

export function CampaignTable({ rows }: { rows: CampaignItem[] }) {
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const state = { returnTo: location.pathname + location.search };
  const noData = t('adminCampaigns.noData');
  const money = (value: number | null) => value === null ? noData : formatMoney(value, lang);
  const openRow = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      || (event.target instanceof Element && event.target.closest('a,button,input')) || window.getSelection()?.toString()) return;
    void navigate(`${CAMPAIGN_LIST}/${id}`, { state });
  };
  return <div className={styles.tableWrap} role="region" aria-label={t('adminCampaigns.title')} tabIndex={0}>
    <table className={styles.table}>
      <caption className={styles.srOnly}>{t('adminCampaigns.title')}</caption>
      <thead><tr>{['number', 'name', 'advertiser', 'status', 'tariff', 'budget', 'paid', 'spent', 'created'].map((key) => <th scope="col" key={key}>{t(`adminCampaigns.columns.${key}`)}</th>)}</tr></thead>
      <tbody>{rows.map((row) => {
        const status = campaignStatus(row.status);
        return <tr key={row.id} onClick={(event) => openRow(event, row.id)}>
          <td>{row.display_id === null ? noData : '№ ' + formatNumber(row.display_id, lang)}</td>
          <td><Link className={styles.nameLink} to={`${CAMPAIGN_LIST}/${row.id}`} state={state}>{row.title?.trim() || row.name?.trim() || noData}</Link></td>
          <td>{row.advertiser || row.user_id || noData}</td>
          <td><Badge tone={status.tone} className={styles.status}>{status.key ? t(status.key) : status.raw}</Badge></td>
          <td>{row.tariffName || row.tariff_id || noData}</td>
          <td>{money(row.budget)}</td><td>{money(row.paid_amount)}</td><td>{money(row.spent_budget)}</td>
          <td>{overviewDate(row.created_at, lang, noData)}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
