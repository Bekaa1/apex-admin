import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, TextField } from '../../design-system';
import { useAuthSession } from '../../auth/useAuthSession';
import { useI18n } from '../../i18n/i18n';
import { lookup, roleError, type LookupItem, type LookupKind } from './api';
import styles from './Roles.module.css';

export function EntityPicker({ kind, value, onChange }: { kind: LookupKind; value: LookupItem | null; onChange: (value: LookupItem | null) => void }) {
  const { t } = useI18n(), { session } = useAuthSession();
  const [text, setText] = useState(''), [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['admin', 'role-lookup', session?.user.id, kind, search],
    queryFn: ({ signal }) => lookup(kind, search, signal), enabled: search.length >= 2, retry: false, gcTime: 0 });
  return <div className={styles.form}>
    <TextField label={t(`roles.lookup.${kind}`)} value={text} maxLength={120} onChange={event => setText(event.target.value)} />
    <div className={styles.actions}><Button size="md" variant="secondary" disabled={text.trim().length < 2 || query.isFetching} onClick={() => { const next = text.trim(); if (next === search) void query.refetch(); else setSearch(next); }}>{t('roles.search')}</Button>
      {value ? <><span>{value.label}</span><Button size="md" variant="ghost" onClick={() => onChange(null)}>{t('roles.clear')}</Button></> : null}</div>
    {query.isError ? <Alert tone="danger">{t(`roles.errors.${roleError(query.error).kind}`)}</Alert> : null}
    {search && query.isPending ? <p role="status">{t('roles.loading')}</p> : null}
    {query.data ? <><p className={styles.muted}>{t(query.data.length ? 'roles.lookupLimit' : 'roles.empty')}</p><ul className={styles.results}>
      {query.data.map(item => <li key={item.id}><Button size="md" variant="secondary" fullWidth onClick={() => onChange(item)}>{item.label}</Button></li>)}
    </ul></> : null}
  </div>;
}
