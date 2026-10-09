import { useId, useRef, useState } from 'react';
import { Alert, Button, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { OverviewLoading } from '../overview/OverviewState';
import { StoreReadError } from '../stores/api';
import { FILTER_LIMIT, isStoreId, PAGE_SIZE, validFilters } from '../stores/model';
import { useStores } from '../stores/useStores';
import { useStoreRecord } from '../stores/details/useStoreDetail';
import shared from '../corporate-requests/CorporateRequestsPage.module.css';
import styles from './EquipmentPage.module.css';

function SelectedStore({ id }: { id: string }) {
  const { t } = useI18n();
  const query = useStoreRecord(id);
  return <p className={styles.selected}>
    {query.isError ? id : query.data?.name.trim() || id}
    {query.isError || query.isSuccess && !query.data ? <small>{t('adminEquipment.selectedUnavailable')}</small> : null}
  </p>;
}

/** Separate server search of stores, never options derived from the equipment page. */
function StoreSearch({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filters = { search, city: '' };
  const valid = validFilters(filters);
  const query = useStores({ filters, page, error: valid ? null : 'filters' });
  const apply = () => { setSearch(draft.trim()); setPage(1); };
  const kind = query.error instanceof StoreReadError ? query.error.kind : 'unavailable';
  return <div className={styles.pickerSearch}>
    <TextField label={t('adminEquipment.storeSearch')} hint={t('adminEquipment.storeSearchHint')} value={draft} maxLength={FILTER_LIMIT}
      autoComplete="off" onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); apply(); } }} />
    <div><Button size="md" variant="secondary" onClick={apply}>{t('adminEquipment.findStores')}</Button></div>
    {!valid ? <Alert tone="danger">{t('adminStores.validation.filters')}</Alert>
      : query.isPending ? <OverviewLoading />
      : query.isError ? <Alert tone="danger" title={t('adminEquipment.storeSearchError')}
        action={<Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>{t(`adminStores.errors.${kind}`)}</Alert>
      : <div className={styles.pickerSearch} aria-busy={query.isFetching}>
        {query.data.rows.length ? <ul className={styles.options}>{query.data.rows.map(row => <li key={row.id}>
          <Button size="md" variant="ghost" fullWidth aria-pressed={selected === row.id} onClick={() => onSelect(row.id)}>
            <span className={styles.optionName}>{row.name.trim() || row.id}</span>
            <span className={styles.optionMeta}>{[row.city, row.address].filter(Boolean).join(' · ') || row.id}</span>
          </Button>
        </li>)}</ul> : <p role="status">{t('adminEquipment.noStores')}</p>}
        <div className={shared.actions}>
          <Button size="md" variant="secondary" disabled={page <= 1 || query.isFetching} onClick={() => setPage(value => value - 1)}>{t('adminStores.previous')}</Button>
          <span>{t('adminStores.page', { page, size: PAGE_SIZE })}</span>
          <Button size="md" variant="secondary" disabled={!query.data.hasNext || query.isFetching} onClick={() => setPage(value => value + 1)}>{t('adminStores.next')}</Button>
        </div>
      </div>}
  </div>;
}

export function StorePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const searchId = useId();
  const field = useRef<HTMLFieldSetElement>(null);
  return <fieldset ref={field} className={styles.storePicker}>
    <legend>{t('adminEquipment.store')}</legend>
    {value && isStoreId(value) ? <SelectedStore key={value} id={value} /> : <p className={styles.selected}>{value || t('adminEquipment.allStores')}</p>}
    <div className={shared.actions}>
      <Button size="md" variant="secondary" aria-expanded={open} aria-controls={open ? searchId : undefined} onClick={() => setOpen(value => !value)}>{t(open ? 'adminEquipment.closeSearch' : 'adminEquipment.chooseStore')}</Button>
      {value ? <Button size="md" variant="ghost" onClick={() => onChange('')}>{t('adminEquipment.allStores')}</Button> : null}
    </div>
    {open ? <div id={searchId}><StoreSearch selected={value} onSelect={id => {
      onChange(id); setOpen(false);
      field.current?.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus();
    }} /></div> : null}
  </fieldset>;
}
