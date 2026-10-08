import { useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, TextAreaField, TextField } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { changeZone, createZone, moveZone, removeZone, validColor, type ZoningDraft, type ZoningIssue } from './model';
import styles from './Zoning.module.css';
import dialogStyles from '../plan/StorePlan.module.css';

function DeleteDialog({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useI18n(), title = useId(), ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal(); dialog?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { dialog?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={dialogStyles.dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); onCancel(); }}>
    <h2 id={title}>{t('adminStoreZoning.deleteTitle')}</h2><p>{t('adminStoreZoning.deleteBody', { name })}</p>
    <div className={dialogStyles.controls}><Button size="md" variant="secondary" onClick={onCancel}>{t('adminStoreRequest.cancel')}</Button>
      <Button size="md" variant="danger" onClick={onConfirm}>{t('adminStoreZoning.delete')}</Button></div>
  </dialog>;
}
export function ZonePanel({ draft, active, onActive, onChange, disabled, issues, serverHint }: {
  draft: ZoningDraft; active: string | null; onActive: (id: string) => void; onChange: (draft: ZoningDraft) => void;
  disabled: boolean; issues: ZoningIssue[]; serverHint?: string;
}) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState<string | null>(null);
  const zone = draft.zones.find(z => z.client_id === active), target = draft.zones.find(z => z.client_id === deleting);
  const counts = new Map<string, number>(); for (const id of draft.assignments.values()) counts.set(id, (counts.get(id) ?? 0) + 1);
  const ownIssues = issues.filter(i => i.zoneId === active);
  function error(field: string, codes: string[]) {
    const found = ownIssues.find(i => codes.includes(i.code));
    return found ? t(`adminStoreZoning.validation.${found.code}`) : serverHint === `zones.${field}` ? t(`adminStoreZoning.hints.zones_${field}`) : undefined;
  }
  return <aside className={`${styles.panel} ${serverHint || issues.some(i => i.code !== 'assignment') ? styles.invalid : ''}`} aria-label={t('adminStoreZoning.zones')}>
    <div className={styles.row}><h3>{t('adminStoreZoning.zones')} ({draft.zones.length}/200)</h3>
      {!disabled && <Button size="md" variant="secondary" disabled={draft.zones.length >= 200} onClick={() => {
        const created = createZone(); onChange({ ...draft, zones: [...draft.zones, created] }); onActive(created.client_id);
      }}>{t('adminStoreZoning.add')}</Button>}
    </div>
    {draft.zones.length === 0 && <p>{t('adminStoreZoning.noZones')}</p>}
    <ol className={styles.zoneList}>{draft.zones.map((item, index) => <li key={item.client_id}>
      <button type="button" className={styles.zoneButton} aria-pressed={active === item.client_id} onClick={() => onActive(item.client_id)}>
        <span className={styles.swatch} style={{ background: validColor(item.color) ? item.color : 'var(--surface-muted)' }} aria-hidden="true" />
        <span>{index + 1}. {item.name.trim() || t('adminStoreZoning.unnamed')}<small>{t('adminStoreZoning.assignedCount', { count: counts.get(item.client_id) ?? 0 })}</small>
          {issues.some(i => i.zoneId === item.client_id) && <small className={styles.error}>{t('adminStoreZoning.checkZone')}</small>}</span>
      </button>
    </li>)}</ol>
    {zone && <div className={styles.fields}>
      <p className={styles.id}>client_id: {zone.client_id}</p>
      <TextField label={t('adminStoreZoning.name')} value={zone.name} readOnly={disabled} error={error('name', ['name', 'duplicateName'])}
        onChange={e => onChange(changeZone(draft, zone.client_id, { name: e.target.value }))} />
      <div className={styles.colorRow}>
        {!disabled && <input type="color" aria-label={t('adminStoreZoning.colorPicker')} value={validColor(zone.color) ? zone.color : '#3366CC'} onChange={e => onChange(changeZone(draft, zone.client_id, { color: e.target.value }))} />}
        <TextField label={t('adminStoreZoning.color')} value={zone.color} readOnly={disabled} maxLength={7} error={error('color', ['color'])}
          onChange={e => onChange(changeZone(draft, zone.client_id, { color: e.target.value }))} />
      </div>
      <TextAreaField label={t('adminStoreZoning.description')} value={zone.description} readOnly={disabled} maxLength={300} showCount rows={3}
        error={error('description', ['description'])} onChange={e => onChange(changeZone(draft, zone.client_id, { description: e.target.value }))} />
      <p>{t('adminStoreZoning.order', { order: draft.zones.indexOf(zone) + 1 })}</p>
      {ownIssues.some(i => i.code === 'emptyZone') && <Alert tone="danger" title={t('adminStoreZoning.validation.emptyZone')} />}
      {!disabled && <div className={styles.row}>
        <Button size="md" variant="secondary" disabled={draft.zones[0] === zone} onClick={() => onChange(moveZone(draft, zone.client_id, -1))}>{t('adminStoreZoning.up')}</Button>
        <Button size="md" variant="secondary" disabled={draft.zones.at(-1) === zone} onClick={() => onChange(moveZone(draft, zone.client_id, 1))}>{t('adminStoreZoning.down')}</Button>
        <Button size="md" variant="danger" onClick={() => setDeleting(zone.client_id)}>{t('adminStoreZoning.delete')}</Button>
      </div>}
    </div>}
    {target && !disabled && <DeleteDialog name={target.name || t('adminStoreZoning.unnamed')} onCancel={() => setDeleting(null)} onConfirm={() => {
      const next = removeZone(draft, target.client_id); onChange(next); if (next.zones[0]) onActive(next.zones[0].client_id); setDeleting(null);
    }} />}
  </aside>;
}
