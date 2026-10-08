import { useState, type FormEvent } from 'react';
import { Alert, Button, Checkbox, Select, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { FILTER_LIMIT } from '../stores/model';
import type { DeviceTab } from '../stores/details/model';
import { CART_STATUSES, emptyFilters, validEquipmentFilters, type EquipmentFilters as Filters } from './model';
import { StorePicker } from './StorePicker';
import shared from '../corporate-requests/CorporateRequestsPage.module.css';
import styles from './EquipmentPage.module.css';

export function EquipmentFilters({ tab, initial, onApply, onReset }: { tab: DeviceTab; initial: Filters; onApply: (filters: Filters) => void; onReset: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault(); setSubmitted(true);
    if (validEquipmentFilters(tab, draft)) onApply({ ...draft, search: draft.search.trim(), status: draft.status.trim() });
  };
  return <form className={shared.filters} onSubmit={submit}>
    <TextField label={t(`adminEquipment.search.${tab}`)} hint={t('adminEquipment.searchHint')} value={draft.search} maxLength={FILTER_LIMIT}
      autoComplete="off" onChange={event => setDraft(value => ({ ...value, search: event.target.value }))} />
    {tab === 'carts' ? <Select label={t('adminEquipment.status')} value={draft.status}
      options={[{ value: '', label: t('adminEquipment.anyStatus') }, ...CART_STATUSES.map(value => ({ value, label: value }))]}
      onValueChange={status => setDraft(value => ({ ...value, status }))} />
      : <TextField label={t('adminEquipment.status')} hint={t('adminEquipment.statusHint')} value={draft.status} maxLength={FILTER_LIMIT}
        autoComplete="off" onChange={event => setDraft(value => ({ ...value, status: event.target.value }))} />}
    <div className={styles.full}><StorePicker value={draft.storeId} onChange={storeId => setDraft(value => ({ ...value, storeId }))} /></div>
    {tab === 'beacons' ? <Checkbox checked={draft.withoutZone} onChange={event => setDraft(value => ({ ...value, withoutZone: event.target.checked }))}>{t('adminStoreDetail.withoutZone')}</Checkbox> : null}
    {submitted && !validEquipmentFilters(tab, draft) ? <div className={styles.full}><Alert tone="warning">{t('adminEquipment.invalid')}</Alert></div> : null}
    <div className={shared.actions}>
      <Button type="submit" size="md">{t('adminStores.apply')}</Button>
      <Button size="md" variant="ghost" onClick={() => { setDraft(emptyFilters()); setSubmitted(false); onReset(); }}>{t('adminStores.reset')}</Button>
    </div>
  </form>;
}
