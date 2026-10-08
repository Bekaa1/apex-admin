import { useState, type FormEvent } from 'react';
import { Alert, Button, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { FILTER_LIMIT, validFilters, type StoreFilters as Filters } from './model';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';
import local from './StoresPage.module.css';

export function StoreFilters({ initial, onApply, onReset }: { initial: Filters; onApply: (filters: Filters) => void; onReset: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (validFilters(draft)) onApply({ search: draft.search.trim(), city: draft.city.trim() });
  };
  const reset = () => { setDraft({ search: '', city: '' }); setSubmitted(false); onReset(); };
  return <form className={styles.filters} onSubmit={submit}>
    <TextField label={t('adminStores.search')} hint={t('adminStores.searchHint')} value={draft.search} maxLength={FILTER_LIMIT} autoComplete="off"
      onChange={event => setDraft(previous => ({ ...previous, search: event.target.value }))} />
    <TextField label={t('adminStores.cityFilter')} hint={t('adminStores.cityHint')} value={draft.city} maxLength={FILTER_LIMIT} autoComplete="off"
      onChange={event => setDraft(previous => ({ ...previous, city: event.target.value }))} />
    {submitted && !validFilters(draft) ? <div className={local.fullRow}><Alert tone="danger">{t('adminStores.validation.filters')}</Alert></div> : null}
    <div className={styles.actions}><Button type="submit" size="md">{t('adminStores.apply')}</Button><Button size="md" variant="ghost" onClick={reset}>{t('adminStores.reset')}</Button></div>
  </form>;
}
