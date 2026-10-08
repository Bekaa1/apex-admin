import { useState, type FormEvent } from 'react';
import { Alert, Button, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { FILTER_LIMIT, clientFilterError, type ClientFilters as Filters } from './model';
import styles from '../corporate-requests/CorporateRequestsPage.module.css';

export function ClientFilters({ initial, disabled, onApply, onReset }: { initial: Filters; disabled: boolean; onApply: (filters: Filters) => void; onReset: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const error = submitted ? clientFilterError(draft) : null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    setSubmitted(true);
    if (!clientFilterError(draft)) onApply({ search: draft.search.trim(), displayId: draft.displayId.trim() });
  };
  const reset = () => { setDraft({ search: '', displayId: '' }); setSubmitted(false); onReset(); };
  return <form className={styles.filters} onSubmit={submit}>
    <TextField label={t('adminClients.search')} hint={t('adminClients.searchHint')} value={draft.search} disabled={disabled} maxLength={FILTER_LIMIT} autoComplete="off"
      onChange={event => setDraft(previous => ({ ...previous, search: event.target.value }))} />
    <TextField label={t('adminClients.numberSearch')} hint={t('adminClients.numberHint')} value={draft.displayId} inputMode="numeric" disabled={disabled} maxLength={FILTER_LIMIT} autoComplete="off"
      error={error === 'number' ? t('adminClients.validation.number') : undefined}
      onChange={event => setDraft(previous => ({ ...previous, displayId: event.target.value }))} />
    {error === 'filters' ? <Alert tone="danger">{t('adminClients.validation.filters')}</Alert> : null}
    <div className={styles.actions}><Button type="submit" size="md" disabled={disabled}>{t('adminClients.apply')}</Button><Button size="md" variant="ghost" disabled={disabled} onClick={reset}>{t('adminClients.reset')}</Button></div>
  </form>;
}
