import { Link, useLocation } from 'react-router';
import { Alert, Badge, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { overviewDate } from '../overview/model';
import { OverviewLoading } from '../overview/OverviewState';
import { CorporateListReadError } from './api';
import { CORPORATE_PAGE_SIZE, messagePreview, type CorporateSelection } from './listModel';
import { CORPORATE_LIST, isRequestId, requestText } from './model';
import { useCorporateList } from './useCorporateList';
import styles from './CorporateRequestsPage.module.css';

export function CorporateResults({ selection, onPage, onReset }: { selection: CorporateSelection; onPage: (page: number) => void; onReset: () => void }) {
  const { t, lang } = useI18n();
  const location = useLocation();
  const query = useCorporateList(selection);
  if (selection.error) return null;
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) {
    const kind = query.error instanceof CorporateListReadError ? query.error.kind : 'unavailable';
    return <Alert tone="danger" title={t(kind === 'denied' ? 'adminCorporateList.deniedTitle' : 'adminCorporateList.errorTitle')}
      action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>
      {t(`adminCorporateList.errors.${kind}`)}
    </Alert>;
  }
  const { rows, count } = query.data;
  const emptyKey = selection.page > 1 ? 'pageEmpty' : selection.filters.search !== '' || selection.filters.status !== '' ? 'noMatches' : 'empty';
  const unspecified = t('adminCorporate.notSpecified');
  return <div className={styles.results} aria-busy={query.isFetching}>
    <div className={styles.actions}>
      <p role="status">{t('adminCorporateList.count', { count: formatNumber(count, lang) })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminCorporateList.refresh')}</Button>
    </div>
    {rows.length ? <div className={styles.tableWrap} role="region" aria-label={t('adminCorporate.listTitle')} tabIndex={0}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{t('adminCorporate.listTitle')}</caption>
        <thead><tr>{['company', 'contactName', 'phone', 'email', 'status', 'createdAt', 'message'].map((key) => <th scope="col" key={key}>{t(`adminCorporate.fields.${key}`)}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td>{isRequestId(row.id) ? <Link className={styles.requestLink} to={`${CORPORATE_LIST}/${row.id}`} state={{ returnTo: location.pathname + location.search }}>{requestText(row.company, unspecified)}</Link> : requestText(row.company, unspecified)}</td>
          <td>{requestText(row.contact_name, unspecified)}</td><td>{requestText(row.phone, unspecified)}</td><td>{requestText(row.email, unspecified)}</td>
          <td><Badge className={styles.status}>{requestText(row.status, unspecified)}</Badge></td>
          <td>{overviewDate(row.created_at, lang, unspecified)}</td><td>{messagePreview(row.message, t('adminCorporate.noMessage'))}</td>
        </tr>)}</tbody>
      </table>
    </div> : <div className={styles.empty} role="status">
      <h2>{t(`adminCorporateList.${emptyKey}.title`)}</h2><p>{t(`adminCorporateList.${emptyKey}.body`)}</p>
      {selection.page > 1 ? <Button size="md" variant="secondary" onClick={() => onPage(1)}>{t('adminCorporateList.firstPage')}</Button>
        : emptyKey === 'noMatches' ? <Button size="md" variant="secondary" onClick={onReset}>{t('adminCorporateList.reset')}</Button> : null}
    </div>}
    <nav className={styles.actions} aria-label={t('adminCorporateList.pagination')}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminCorporateList.previous')}</Button>
      <p>{t('adminCorporateList.page', { page: selection.page, size: CORPORATE_PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={selection.page * CORPORATE_PAGE_SIZE >= count || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminCorporateList.next')}</Button>
    </nav>
  </div>;
}
