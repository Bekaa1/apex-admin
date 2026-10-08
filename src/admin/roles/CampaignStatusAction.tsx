import { useState } from 'react';
import { Alert, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import type { CampaignDetail } from '../campaigns/details/model';
import { ConfirmChange } from './ConfirmChange';
import { useStatusOperation } from './useStatusOperation';
import styles from './Roles.module.css';

export function CampaignStatusAction({ id, row, fetching }: { id: string; row?: CampaignDetail | null; fetching: boolean }) {
  const { t } = useI18n(), operation = useStatusOperation('campaign', id);
  const [review, setReview] = useState<{ action: 'pause' | 'resume'; name: string } | null>(null);
  const eligible = row?.status === 'active' || row?.status === 'paused';
  return <>
    {operation.state.issue ? <Alert tone="danger" action={<Button size="md" loading={operation.state.busy} onClick={() => { void operation.refresh(); }}>{t('roles.refresh')}</Button>}>{t(`adminModeration.errors.${operation.state.issue}`)}</Alert> : null}
    {operation.state.saved ? <Alert tone="success">{t('roles.saved')}</Alert> : null}
    {eligible ? <div className={styles.actions}><Button size="md" variant="secondary" disabled={fetching || operation.state.busy || operation.state.blocked} onClick={() => setReview({ action: row.status === 'active' ? 'pause' : 'resume', name: `№ ${row.display_id ?? '—'} · ${row.title || row.name || '—'}` })}>{t(row.status === 'active' ? 'roles.pause' : 'roles.resume')}</Button></div> : null}
    {review ? <ConfirmChange title={t(review.action === 'pause' ? 'roles.pause' : 'roles.resume')} busy={operation.state.busy} onClose={() => setReview(null)} onConfirm={() => { void operation.submit(review.action).finally(() => setReview(null)); }}><p>{review.name}</p><p>{t('roles.statusConfirm')}</p></ConfirmChange> : null}
  </>;
}
