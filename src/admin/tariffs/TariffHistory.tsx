import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Button } from '../../design-system';
import { useAuthSession } from '../../auth/useAuthSession';
import { useI18n } from '../../i18n/i18n';
import { requireSupabase } from '../../lib/supabase';
import { formatAuditDate } from '../audit/model';
import { record, roleError, RoleApiError, textValue, uuid } from '../roles/api';
import styles from '../roles/Roles.module.css';

async function readHistory(id: string, signal: AbortSignal) {
  const { data, error } = await requireSupabase().rpc('admin_tariff_history', { p_tariff_id: uuid(id), p_limit: 50 }).abortSignal(signal);
  if (error) throw roleError(error);
  if (!Array.isArray(data)) throw new RoleApiError('invalid');
  return data.map(value => {
    const row = record(value);
    if (typeof row.id !== 'number' || !Number.isSafeInteger(row.id)) throw new RoleApiError('invalid');
    return { id: row.id, action: textValue(row.action), date: textValue(row.changed_at), actor: textValue(row.changed_by),
      version: typeof row.version === 'number' ? String(row.version) : '', before: JSON.stringify(row.old_values ?? null, null, 2), after: JSON.stringify(row.new_values ?? null, null, 2) };
  });
}
function HistoryRows({ id }: { id: string }) {
  const { t, lang } = useI18n(), { session } = useAuthSession();
  const query = useQuery({ queryKey: ['admin', 'tariff-history', session?.user.id, id], queryFn: ({ signal }) => readHistory(id, signal), retry: false, gcTime: 0 });
  if (query.isPending) return <p role="status">{t('roles.loading')}</p>;
  if (query.isError) return <Alert tone="danger" action={<Button size="md" onClick={() => { void query.refetch(); }}>{t('roles.retry')}</Button>}>{t(`roles.errors.${roleError(query.error).kind}`)}</Alert>;
  return <div className={styles.form}><p className={styles.muted}>{t('roles.historyLimit')}</p>
    {!query.data.length ? <p>{t('roles.empty')}</p> : query.data.map(row => <details key={row.id} className={styles.history}>
      <summary>{formatAuditDate(row.date, lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-RU' : 'en-GB', t('roles.notSpecified'))} · {row.action} · {t('roles.version')}: {row.version || t('roles.notSpecified')}</summary>
      <p>{t('roles.historyActor')}: {row.actor || t('roles.notSpecified')}</p><div className={styles.columns}>
        <div><h3>{t('roles.before')}</h3><pre tabIndex={0}>{row.before}</pre></div>
        <div><h3>{t('roles.after')}</h3><pre tabIndex={0}>{row.after}</pre></div>
      </div>
    </details>)}
  </div>;
}
export function TariffHistory({ id }: { id: string }) {
  const { t } = useI18n(), [open, setOpen] = useState(false);
  return <div className={styles.form}><div><Button size="md" variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{t(open ? 'roles.hideHistory' : 'roles.history')}</Button></div>{open ? <HistoryRows id={id} /> : null}</div>;
}
