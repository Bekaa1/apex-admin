import { useState, type FormEvent } from 'react';
import { Button, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { FILTER_MAX_LENGTH, type CorporateFilters as Filters } from './listModel';
import styles from './CorporateRequestsPage.module.css';

export function CorporateFilters({ initial, onApply, onReset }: { initial: Filters; onApply: (filters: Filters) => void; onReset: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const submit = (event: FormEvent) => { event.preventDefault(); onApply(draft); };
  return <form className={styles.filters} onSubmit={submit}>
    <TextField label={t('adminCorporateList.search')} hint={t('adminCorporateList.searchHint')} value={draft.search} maxLength={FILTER_MAX_LENGTH} autoComplete="off"
      onChange={(event) => setDraft((previous) => ({ ...previous, search: event.target.value }))} />
    <TextField label={t('adminCorporateList.status')} hint={t('adminCorporateList.statusHint')} value={draft.status} maxLength={FILTER_MAX_LENGTH} autoComplete="off"
      onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value }))} />
    <div className={styles.actions}><Button size="md" type="submit">{t('adminCorporateList.apply')}</Button><Button size="md" variant="ghost" onClick={onReset}>{t('adminCorporateList.reset')}</Button></div>
  </form>;
}
