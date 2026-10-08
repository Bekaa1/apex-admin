import { useId, useState, type FormEvent } from 'react';
import { Button, TextField } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { CAMPAIGN_STATUSES, campaignStatus, FILTER_LIMIT, type CampaignFilters as Filters } from './model';
import styles from './CampaignsPage.module.css';

export function CampaignFilters({ initial, onApply, onReset, fixedStatus = false }: { initial: Filters; onApply: (filters: Filters) => void; onReset: () => void; fixedStatus?: boolean }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const optionsId = useId();
  const submit = (event: FormEvent) => { event.preventDefault(); onApply(draft); };
  return <form className={styles.filters} onSubmit={submit}>
    <TextField label={t('adminCampaigns.search')} hint={t('adminCampaigns.searchHint')} value={draft.search} maxLength={FILTER_LIMIT} autoComplete="off"
      onChange={(event) => setDraft((previous) => ({ ...previous, search: event.target.value }))} />
    {fixedStatus ? <p>{t('adminModeration.fixedStatus')}</p> : <TextField label={t('adminCampaigns.statusFilter')} hint={t('adminCampaigns.statusHint')} value={draft.status} list={optionsId} maxLength={FILTER_LIMIT} autoComplete="off"
      onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value }))} />}
    <datalist id={optionsId}>{CAMPAIGN_STATUSES.map((status) => { const label = campaignStatus(status); return <option key={status} value={status}>{label.key ? t(label.key) : label.raw}</option>; })}</datalist>
    <div className={styles.actions}><Button type="submit" size="md">{t('adminCampaigns.apply')}</Button><Button size="md" variant="ghost" onClick={onReset}>{t('adminCampaigns.reset')}</Button></div>
  </form>;
}
