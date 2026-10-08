import { Badge, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { requestPath } from '../onboarding/model';
import { isStatus, requestAction, statusTone, type RequestItem } from './model';
import styles from './StoreRequests.module.css';

export function StoreRequestRows({ rows }: { rows: RequestItem[] }) {
  const { t, lang } = useI18n();
  const formatter = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Almaty' });
  const date = (value: string | null) => value === null ? t('adminStoreRequests.notSpecified')
    : formatter.format(new Date(value));
  const columns = ['name', 'location', 'status', 'dates', 'plan', 'zones', 'actions'];
  const items = rows.map(row => {
    const action = requestAction(row);
    return { id: row.id, cells: [
      <div key="name" className={styles.stack}><strong>{row.name || t('adminStoreRequests.unnamed')}</strong>{row.isMine && <Badge tone="brand">{t('adminStoreRequests.mine')}</Badge>}</div>,
      <div key="location" className={styles.stack}><span>{row.city || t('adminStoreRequests.notSpecified')}</span><span className={styles.muted}>{row.address || t('adminStoreRequests.notSpecified')}</span></div>,
      <div key="status" className={styles.stack}><Badge dot tone={statusTone(row.status)}>{isStatus(row.status) ? t(`adminStoreRequests.statuses.${row.status}`) : row.status}</Badge>
        {row.status === 'rejected' && <div className={styles.comment} tabIndex={0} role="region" aria-label={t('adminStoreRequests.ownerComment')}>
          <strong>{t('adminStoreRequests.ownerComment')}</strong><p>{row.reviewComment || t('adminStoreRequests.noComment')}</p>
        </div>}</div>,
      <div key="dates" className={styles.stack}><span>{t('adminStoreRequests.updated')}: {date(row.updatedAt)}</span>
        {row.submittedAt !== null && <span className={styles.muted}>{t('adminStoreRequests.submitted')}: {date(row.submittedAt)}</span>}</div>,
      <Badge key="plan" tone={row.hasPlan ? 'success' : 'neutral'}>{t(`adminStoreRequests.${row.hasPlan ? 'hasPlan' : 'noPlan'}`)}</Badge>,
      <span key="zones">{row.zoneCount}</span>,
      <div key="actions" className={styles.stack}><Button size="md" variant="secondary" href={action.href}>{t(`adminStoreRequests.${action.label}`)}</Button>
        {action.label === 'openStore' && <Button size="md" variant="ghost" href={requestPath(row.id, 'review')}>{t('adminStoreRequests.viewRequest')}</Button>}</div>,
    ] };
  });
  return <>
    <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={t('adminStoreRequests.title')}>
      <table className={styles.table}><caption className={styles.srOnly}>{t('adminStoreRequests.title')}</caption>
        <thead><tr>{columns.map(column => <th key={column} scope="col">{t(`adminStoreRequests.columns.${column}`)}</th>)}</tr></thead>
        <tbody>{items.map(item => <tr key={item.id}>{item.cells.map((cell, i) => <td key={columns[i]}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <ul className={styles.cards} aria-label={t('adminStoreRequests.title')}>{items.map(item => <li className={styles.card} key={item.id}>
      <dl>{item.cells.map((cell, i) => <div key={columns[i]}><dt>{t(`adminStoreRequests.columns.${columns[i]}`)}</dt><dd>{cell}</dd></div>)}</dl>
    </li>)}</ul>
  </>;
}
