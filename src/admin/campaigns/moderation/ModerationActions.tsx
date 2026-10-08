import { useState } from 'react';
import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber } from '../../../lib/format';
import type { CampaignDetail } from '../details/model';
import { ModerationDialog } from './ModerationDialog';
import { terminalIssue, type Reason } from './model';
import { useModeration } from './useModeration';
import styles from './Moderation.module.css';

/** Kept outside the main query's error/loading boundary so reconciliation cannot erase a draft. */
export function ModerationActions({ id, row, fetching }: { id: string; row?: CampaignDetail | null; fetching: boolean }) {
  const { t, lang } = useI18n();
  const { state, controller } = useModeration(id);
  const [dialog, setDialog] = useState<{ approve: boolean; campaign: string } | null>(null);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [comment, setComment] = useState('');
  const pending = row?.status === 'pending' && !fetching;
  const open = (approve: boolean) => {
    if (!row || !pending || state.busy || state.succeeded || terminalIssue(state.issue)) return;
    setDialog({ approve, campaign: `${row.display_id === null ? t('adminCampaigns.noData') : '№ ' + formatNumber(row.display_id, lang)} · ${row.title?.trim() || row.name?.trim() || t('adminCampaigns.noData')}` });
  };
  return <>
    {row?.status === 'pending' || state.succeeded || state.issue ? <section className={styles.panel} aria-label={t('adminModeration.actions')}>
      {!dialog && state.succeeded ? <Alert tone="success">{t('adminModeration.success')}</Alert> : null}
      {!dialog && state.issue ? <Alert tone="danger">{t(`adminModeration.errors.${state.issue}`)}</Alert> : null}
      {row?.status === 'pending' && !state.succeeded && !terminalIssue(state.issue) ? <div className={styles.actions}>
        <Button size="md" disabled={!pending || state.busy} onClick={() => open(true)}>{t('adminModeration.approve')}</Button>
        <Button size="md" variant="danger" disabled={!pending || state.busy} onClick={() => open(false)}>{t('adminModeration.reject')}</Button>
      </div> : null}
      {!dialog && state.needsRefresh ? <Button size="md" variant="secondary" loading={state.busy} onClick={() => { void controller.refresh(); }}>{t('adminModeration.checkState')}</Button> : null}
    </section> : null}
    {dialog ? <ModerationDialog {...dialog} state={state} pending={pending} reasons={reasons} comment={comment} onReasons={setReasons} onComment={setComment}
      onClose={() => setDialog(null)} onRefresh={() => { void controller.refresh(); }}
      onSubmit={() => { void controller.submit({ id, approve: dialog.approve, reasons, comment }); }} /> : null}
  </>;
}
