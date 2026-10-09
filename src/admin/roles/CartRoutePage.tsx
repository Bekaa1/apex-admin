import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { Alert, Button, TextField } from '../../design-system';
import { useAuthSession } from '../../auth/useAuthSession';
import { usePermissions } from '../../auth/usePermissions';
import { useI18n } from '../../i18n/i18n';
import { todayInAlmaty } from '../../lib/dates';
import { formatNumber } from '../../lib/format';
import { formatAuditDate } from '../audit/model';
import { isStoreId } from '../stores/model';
import { roleError } from './api';
import { readCartRoute, validRoutePeriod } from './cartRoute';
import styles from './Roles.module.css';

export function CartRoutePage() {
  const { id } = useParams(), { session } = useAuthSession(), { can } = usePermissions(), { t, lang } = useI18n();
  const [from, setFrom] = useState(todayInAlmaty), [to, setTo] = useState(todayInAlmaty);
  const [period, setPeriod] = useState(() => ({ from: todayInAlmaty(), to: todayInAlmaty() })), [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['admin', 'cart-route', session?.user.id, id, period], queryFn: ({ signal }) => readCartRoute(id ?? '', period.from, period.to, signal), enabled: isStoreId(id), retry: false, gcTime: 0 });
  const unknown = t('roles.notSpecified'), date = (value: string) => value ? formatAuditDate(value, lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-RU' : 'en-GB', unknown) : unknown;
  return <section className={styles.page}><div><Button href={can('equipment') ? '/admin/equipment' : '/admin/partner/equipment'} variant="ghost" size="md" iconLeft="arrow-left">{t('roles.storeEquipment')}</Button></div>
    <h1>{t('roles.route')}</h1><p className={styles.muted}>{t('roles.routeDescription')}</p>
    <form className={styles.actions} onSubmit={event => { event.preventDefault(); if (validRoutePeriod(from, to)) { setPage(1); setPeriod({ from, to }); if (period.from === from && period.to === to) void query.refetch(); } }}>
      <TextField type="date" label={t('roles.from')} value={from} onChange={event => setFrom(event.target.value)} />
      <TextField type="date" label={t('roles.to')} value={to} onChange={event => setTo(event.target.value)} />
      <Button size="md" type="submit" disabled={!validRoutePeriod(from, to) || query.isFetching || !isStoreId(id)}>{t('roles.show')}</Button>
    </form>
    {!validRoutePeriod(from, to) ? <Alert tone="danger">{t('roles.periodError')}</Alert> : null}
    {!isStoreId(id) ? <Alert tone="danger">{t('roles.errors.invalid')}</Alert> : query.isPending ? <p role="status">{t('roles.loading')}</p> : query.isError ? <Alert tone="danger" action={<Button size="md" onClick={() => { void query.refetch(); }}>{t('roles.retry')}</Button>}>{t(`roles.errors.${roleError(query.error).kind}`)}</Alert>
      : !query.data.length ? <p>{t('roles.empty')}</p> : <><p className={styles.muted}>{t('roles.routeCount', { count: query.data.length })}</p>
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={t('roles.route')}><table className={styles.table}><thead><tr>{['zone', 'entered', 'left', 'plays'].map(key => <th key={key} scope="col">{t(`roles.${key}`)}</th>)}</tr></thead>
          <tbody>{query.data.slice((page - 1) * 25, page * 25).map((row, index) => <tr key={`${row.zoneId}:${row.entered}:${index}`}><td>{row.name || row.zoneId || unknown}</td><td>{date(row.entered)}</td><td>{date(row.left)}</td><td>{row.plays === null ? unknown : formatNumber(row.plays, lang)}</td></tr>)}</tbody></table></div>
        <div className={styles.actions}><Button size="md" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('roles.previous')}</Button><span>{t('roles.page', { page })}</span><Button size="md" variant="secondary" disabled={page * 25 >= query.data.length} onClick={() => setPage(page + 1)}>{t('roles.next')}</Button></div>
      </>}
  </section>;
}
