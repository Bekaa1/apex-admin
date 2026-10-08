import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useI18n } from '../../i18n/i18n';
import { overviewDate } from '../overview/model';
import { storeDetailPath, type StoreItem } from './model';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';
import local from './StoresPage.module.css';

/** Rows and keyboard-accessible links open the guarded Apex store card. */
export function StoreTable({ rows }: { rows: StoreItem[] }) {
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const state = { returnTo: location.pathname + location.search };
  const openRow = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      || (event.target instanceof Element && event.target.closest('a,button,input')) || window.getSelection()?.toString()) return;
    void navigate(storeDetailPath(id), { state });
  };
  const unknown = t('adminStores.notSpecified');
  return <div className={styles.tableWrap} role="region" aria-label={t('adminStores.title')} tabIndex={0}>
    <table className={`${styles.table} ${local.table}`}>
      <caption className={styles.srOnly}>{t('adminStores.title')}</caption>
      <thead><tr>{['name', 'city', 'address', 'partner', 'timezone', 'created'].map(key => <th key={key} scope="col">{t(`adminStores.columns.${key}`)}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} onClick={event => openRow(event, row.id)}>
        <td><Link className={styles.requestLink} to={storeDetailPath(row.id)} state={state}>{row.name.trim() || unknown}</Link></td><td>{row.city?.trim() || unknown}</td>
        <td>{row.address?.trim() || unknown}</td><td>{row.partnerName || row.partner_id || unknown}</td>
        <td>{row.timezone?.trim() || unknown}</td><td>{overviewDate(row.created_at, lang, unknown)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
