import { useState, type FormEvent } from 'react';
import { Button, Select, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { PERIODS, type AuditFilters as Filters } from './model';
import styles from './AuditPage.module.css';

export function AuditFilters({ initial, onApply, onReset }: { initial: Filters; onApply: (filters: Filters) => void; onReset: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const update = (key: keyof Filters, value: string) => setDraft((previous) => ({ ...previous, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); onApply(draft); };
  return <form className={styles.filters} onSubmit={submit}>
    <Select label={t('adminAudit.period')} value={draft.period} onValueChange={(value) => update('period', value)} size="md" options={PERIODS.map((value) => ({ value, label: t(`adminAudit.periods.${value}`) }))} />
    {draft.period === 'custom' ? <>
      <TextField type="date" label={t('adminAudit.from')} value={draft.from} onChange={(e) => update('from', e.target.value)} required />
      <TextField type="date" label={t('adminAudit.to')} value={draft.to} onChange={(e) => update('to', e.target.value)} required />
    </> : null}
    <TextField label={t('adminAudit.filters.action')} value={draft.action} onChange={(e) => update('action', e.target.value)} autoComplete="off" />
    <TextField label={t('adminAudit.filters.entityType')} value={draft.entityType} onChange={(e) => update('entityType', e.target.value)} autoComplete="off" />
    <TextField label={t('adminAudit.filters.actor')} value={draft.actorId} onChange={(e) => update('actorId', e.target.value)} autoComplete="off" />
    <TextField label={t('adminAudit.filters.entity')} value={draft.entityId} onChange={(e) => update('entityId', e.target.value)} autoComplete="off" />
    <p className={styles.filterHint}>{t('adminAudit.filterHint')}</p>
    <div className={styles.actions}><Button size="md" type="submit">{t('adminAudit.apply')}</Button><Button size="md" variant="ghost" onClick={onReset}>{t('adminAudit.reset')}</Button></div>
  </form>;
}
