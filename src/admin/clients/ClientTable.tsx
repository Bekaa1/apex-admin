import { Link, useLocation } from 'react-router';
import { useI18n } from '../../i18n/i18n';
import { overviewDate } from '../overview/model';
import { clientName, type ClientRow } from './model';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';
import local from './ClientsPage.module.css';

/** Read-only cells with keyboard-accessible links to the guarded profile route. */
export function ClientTable({ rows }: { rows: ClientRow[] }) {
  const { t, lang } = useI18n();
  const location = useLocation();
  const state = { returnTo: location.pathname + location.search };
  const unknown = t('adminClients.notSpecified');
  return <div className={styles.tableWrap} role="region" aria-label={t('adminClients.title')} tabIndex={0}>
    <table className={`${styles.table} ${local.table}`}>
      <caption className={styles.srOnly}>{t('adminClients.title')}</caption>
      <thead><tr>{['number', 'name', 'company', 'bin', 'email', 'phone', 'created'].map(key => <th key={key} scope="col">{t(`adminClients.columns.${key}`)}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}>
        <td>{row.display_id === null ? unknown : `№ ${row.display_id}`}</td>
        <td><Link className={local.nameLink} to={`/admin/clients/${row.id}`} state={state}>{clientName(row, unknown)}</Link></td><td>{row.company_name?.trim() || unknown}</td>
        <td>{row.bin?.trim() || unknown}</td><td>{row.email?.trim() || unknown}</td><td>{row.phone?.trim() || unknown}</td>
        <td>{overviewDate(row.created_at, lang, unknown)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
