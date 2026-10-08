import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Alert, Button, Skeleton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { todayInAlmaty } from '../../lib/dates';
import { AUDIT_ACCESS } from './api';
import { AuditDetails } from './AuditDetails';
import { AuditError } from './AuditError';
import { AuditFilters } from './AuditFilters';
import { AUDIT_PAGE_SIZE, auditParams, formatAuditDate, readAuditSelection, type AuditSelection } from './model';
import { useAuditPage } from './useAudit';
import styles from './AuditPage.module.css';

const LOCALES = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' };

function AuditResults({ selection, today, onPage }: { selection: AuditSelection; today: string; onPage: (page: number) => void }) {
  const { t, lang } = useI18n();
  const query = useAuditPage(selection, today);
  const [selected, setSelected] = useState<string | null>(null);
  if (!AUDIT_ACCESS.confirmed) return <Alert tone="warning" title={t('adminAudit.errors.unconfigured.title')}>{t('adminAudit.errors.unconfigured.body')}</Alert>;
  if (selection.error) return null;
  if (query.isPending) return <div role="status" aria-busy="true"><p>{t('adminAudit.loading')}</p><Skeleton variant="block" height="var(--control-lg)" /></div>;
  if (query.isError) return <AuditError error={query.error} pending={query.isFetching} retry={() => { void query.refetch(); }} />;
  const { rows, count } = query.data;
  const locale = LOCALES[lang];
  const canNext = count === null ? rows.length === AUDIT_PAGE_SIZE : selection.page * AUDIT_PAGE_SIZE < count;
  return <div className={styles.results}>
    <div className={styles.actions}>
      <p>{count === null ? t('adminAudit.countUnknown') : t('adminAudit.visibleCount', { count })}</p>
      <Button size="md" variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('adminAudit.refresh')}</Button>
    </div>
    {rows.length ? <div className={styles.tableWrap} role="region" aria-label={t('adminAudit.tableLabel')} tabIndex={0}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{t('adminAudit.tableLabel')}</caption>
        <thead><tr>{['created', 'actor', 'action', 'entityType', 'entity'].map((key) => <th scope="col" key={key}>{t(`adminAudit.columns.${key}`)}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} onClick={(event) => { event.currentTarget.querySelector('button')?.focus(); setSelected(row.id); }}>
          <td><button className={styles.eventButton} aria-label={t('adminAudit.openEvent', { id: row.id })} onClick={(event) => { event.stopPropagation(); setSelected(row.id); }}>{formatAuditDate(row.created_at, locale, t('adminAudit.unknown'))}</button></td>
          <td>{row.actor_user_id || t('adminAudit.notSpecified')}</td><td>{row.action}</td><td>{row.entity_type}</td><td>{row.entity_id || t('adminAudit.notSpecified')}</td>
        </tr>)}</tbody>
      </table>
    </div> : <div className={styles.empty}><h2>{t('adminAudit.empty.title')}</h2><p>{t('adminAudit.empty.body')}</p></div>}
    <nav className={styles.actions} aria-label={t('adminAudit.pagination')}>
      <Button size="md" variant="secondary" disabled={selection.page <= 1 || query.isFetching} onClick={() => onPage(selection.page - 1)}>{t('adminAudit.previous')}</Button>
      <p>{t('adminAudit.page', { page: selection.page, size: AUDIT_PAGE_SIZE })}</p>
      <Button size="md" variant="secondary" disabled={!canNext || query.isFetching} onClick={() => onPage(selection.page + 1)}>{t('adminAudit.next')}</Button>
    </nav>
    {selected ? <AuditDetails key={selected} id={selected} locale={locale} onClose={() => setSelected(null)} /> : null}
  </div>;
}

export function AuditPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [today] = useState(() => todayInAlmaty());
  const selection = readAuditSelection(params, today);
  const signature = params.toString();
  return <section className={styles.page} aria-labelledby="audit-title">
    <header><h1 id="audit-title">{t('adminAudit.title')}</h1><p className={styles.muted}>{t('adminAudit.description')}</p></header>
    <p className={styles.muted}>{t('adminAudit.coverage')}</p>
    <AuditFilters key={'filters:' + signature} initial={selection.filters} onApply={(filters) => setParams(auditParams(params, filters, 1))} onReset={() => setParams(auditParams(params, readAuditSelection(new URLSearchParams(), today).filters, 1))} />
    {selection.error ? <Alert tone="danger">{t(`adminAudit.validation.${selection.error}`)}</Alert> : null}
    <AuditResults key={'results:' + signature} selection={selection} today={today} onPage={(page) => setParams(auditParams(params, selection.filters, page), { preventScrollReset: true })} />
  </section>;
}
