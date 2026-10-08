import { REASONS, type Reason } from '../moderation/model';
import { useI18n } from '../../../i18n/i18n';
import { overviewDate } from '../../overview/model';
import { DetailField } from './DetailState';
import type { CampaignDetail } from './model';
import styles from './CampaignDetail.module.css';

export function ModerationDetails({ row }: { row: CampaignDetail }) {
  const { t, lang } = useI18n();
  const unknown = t('adminCampaigns.noData');
  return <section className={styles.panel} aria-labelledby="campaign-moderation">
    <h2 id="campaign-moderation">{t('adminCampaignDetail.moderation')}</h2>
    <dl className={styles.fields}>
      <DetailField full label={t('adminCampaignDetail.rejectionReasons')}>
        {row.rejection_reasons?.length ? <ul className={styles.reasons}>{row.rejection_reasons.map((reason, index) => <li key={`${index}:${reason}`}>{REASONS.includes(reason as Reason) ? t(`adminModeration.reason.${reason}`) : reason}</li>)}</ul> : unknown}
      </DetailField>
      <DetailField full label={t('adminCampaignDetail.moderatorComment')}>{row.moderator_comment?.trim() || unknown}</DetailField>
      <DetailField label={t('adminCampaignDetail.moderatedAt')}>{overviewDate(row.moderated_at, lang, unknown)}</DetailField>
      {/* No generated FK identifies a profile for moderated_by. Display the stored actor ID. */}
      <DetailField label={t('adminCampaignDetail.moderatedBy')}>{row.moderated_by?.trim() || unknown}</DetailField>
    </dl>
  </section>;
}
