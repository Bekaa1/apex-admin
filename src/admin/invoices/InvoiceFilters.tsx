import { useId, useState, type FormEvent } from 'react';
import { Alert, Button, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { FILTER_LIMIT, INVOICE_KINDS, INVOICE_STATUSES, filterError, type InvoiceFilters as Filters } from './model';
import styles from '../campaigns/CampaignsPage.module.css';
import invoiceStyles from './InvoicesPage.module.css';

export function InvoiceFilters({ initial, onApply, onReset }: { initial: Filters; onApply: (filters: Filters) => void; onReset: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const optionsId = useId();
  const error = submitted ? filterError(draft) : null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!filterError(draft)) onApply({ ...draft, search: draft.search.trim() });
  };
  const reset = () => {
    setDraft({ search: '', status: '', kind: '' });
    setSubmitted(false);
    onReset();
  };
  return <form className={`${styles.filters} ${invoiceStyles.filters}`} onSubmit={submit}>
    <TextField label={t('adminInvoices.search')} hint={t('adminInvoices.searchHint')} value={draft.search} inputMode="numeric" maxLength={FILTER_LIMIT} autoComplete="off"
      error={error === 'number' ? t('adminInvoices.validation.number') : undefined}
      onChange={(event) => setDraft(previous => ({ ...previous, search: event.target.value }))} />
    <TextField label={t('adminInvoices.statusFilter')} hint={t('adminInvoices.exactHint')} value={draft.status} list={`${optionsId}-status`} maxLength={FILTER_LIMIT} autoComplete="off"
      onChange={(event) => setDraft(previous => ({ ...previous, status: event.target.value }))} />
    <TextField label={t('adminInvoices.kindFilter')} hint={t('adminInvoices.exactHint')} value={draft.kind} list={`${optionsId}-kind`} maxLength={FILTER_LIMIT} autoComplete="off"
      onChange={(event) => setDraft(previous => ({ ...previous, kind: event.target.value }))} />
    <datalist id={`${optionsId}-status`}>{INVOICE_STATUSES.map(status => <option key={status} value={status}>{t(`adminInvoices.statuses.${status}`)}</option>)}</datalist>
    <datalist id={`${optionsId}-kind`}>{INVOICE_KINDS.map(kind => <option key={kind} value={kind}>{t(`adminInvoices.kinds.${kind}`)}</option>)}</datalist>
    {error === 'filters' ? <div className={invoiceStyles.fullRow}><Alert tone="danger">{t('adminInvoices.validation.filters')}</Alert></div> : null}
    <div className={styles.actions}><Button type="submit" size="md">{t('adminInvoices.apply')}</Button><Button size="md" variant="ghost" onClick={reset}>{t('adminInvoices.reset')}</Button></div>
  </form>;
}
