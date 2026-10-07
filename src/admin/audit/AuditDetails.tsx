import { useEffect, useId, useRef } from 'react';
import { Alert, IconButton, Skeleton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { AuditError } from './AuditError';
import { formatAuditDate, formatAuditJson, type AuditEvent } from './model';
import { useAuditEvent } from './useAudit';
import styles from './AuditPage.module.css';

function EventDetails({ event, locale }: { event: AuditEvent; locale: string }) {
  const { t } = useI18n();
  const fields = [
    ['id', event.id], ['created', formatAuditDate(event.created_at, locale, t('adminAudit.unknown'))],
    ['actor', event.actor_user_id || t('adminAudit.notSpecified')], ['action', event.action],
    ['entityType', event.entity_type], ['entity', event.entity_id || t('adminAudit.notSpecified')],
  ];
  return <>
    <dl className={styles.metadata}>{fields.map(([key, value]) => <div key={key}><dt>{t(`adminAudit.columns.${key}`)}</dt><dd>{value}</dd></div>)}</dl>
    {(['before', 'after'] as const).map((key) => <section className={styles.jsonSection} key={key}>
      <h3>{t(`adminAudit.${key}`)}</h3>
      <pre className={styles.json} tabIndex={0} aria-label={t(`adminAudit.${key}`)}><code>{formatAuditJson(event[key])}</code></pre>
    </section>)}
  </>;
}

export function AuditDetails({ id, locale, onClose }: { id: string; locale: string; onClose: () => void }) {
  const { t } = useI18n();
  const query = useAuditEvent(id);
  const ref = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { dialog?.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.drawer} aria-labelledby={title} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className={styles.drawerHeader}><h2 id={title}>{t('adminAudit.details')}</h2><IconButton icon="x" label={t('adminAudit.close')} onClick={onClose} /></header>
    {query.isPending ? <div role="status"><p>{t('adminAudit.loading')}</p><Skeleton variant="block" height="var(--control-lg)" /></div>
      : query.isError ? <AuditError error={query.error} pending={query.isFetching} retry={() => { void query.refetch(); }} />
      : query.data ? <EventDetails event={query.data} locale={locale} />
      : <Alert tone="warning" title={t('adminAudit.notFound.title')}>{t('adminAudit.notFound.body')}</Alert>}
  </dialog>;
}
