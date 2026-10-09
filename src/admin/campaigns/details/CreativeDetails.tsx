import { useState } from 'react';
import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber } from '../../../lib/format';
import { formatMediaSize } from '../../media/model';
import { DetailField } from './DetailState';
import { mediaUrl, resolution, type CampaignDetail } from './model';
import styles from './CampaignDetail.module.css';

function CreativeAsset({ source, video }: { source: string | null; video: boolean }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const kind = video ? 'video' : 'cover';
  const url = mediaUrl(source);
  if (!source?.trim()) return <p className={styles.empty}>{t(`adminCampaignDetail.${kind}Missing`)}</p>;
  if (!url) return <Alert tone="danger">{t('adminCampaignDetail.invalidMediaUrl')}</Alert>;
  if (failed) return <Alert tone="danger" title={t(`adminCampaignDetail.${kind}Error`)}
    action={<Button variant="secondary" size="md" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>{t('cabinet.retry')}</Button>}>
    {t('adminCampaignDetail.mediaErrorBody')}
  </Alert>;
  return video
    ? <video key={attempt} className={styles.video} src={url} controls preload="none" playsInline aria-label={t('adminCampaignDetail.video')} onError={() => setFailed(true)} />
    : <img key={attempt} className={styles.cover} src={url} loading="lazy" referrerPolicy="no-referrer" alt={t('adminCampaignDetail.cover')} onError={() => setFailed(true)} />;
}
export function CreativeDetails({ row }: { row: CampaignDetail }) {
  const { t, lang } = useI18n();
  const unknown = t('adminCampaigns.noData');
  const duration = row.video_duration_sec;
  return <section className={styles.panel} aria-labelledby="campaign-creative">
    <h2 id="campaign-creative">{t('adminCampaignDetail.creative')}</h2>
    <h3>{t('adminCampaignDetail.video')}</h3>
    <CreativeAsset key={'video:' + row.video_url} source={row.video_url} video />
    <dl className={styles.fields}>
      <DetailField full label={t('adminCampaignDetail.filename')}>{row.video_original_filename?.trim() || unknown}</DetailField>
      <DetailField label={t('adminCampaignDetail.duration')}>{duration !== null && duration > 0 ? t('adminCampaignDetail.seconds', { value: formatNumber(duration, lang) }) : unknown}</DetailField>
      <DetailField label={t('adminCampaignDetail.resolution')}>{resolution(row.video_width, row.video_height, unknown)}</DetailField>
      <DetailField label={t('adminCampaignDetail.size')}>{formatMediaSize(row.video_size_bytes, lang === 'en' ? 'en-US' : 'ru-RU', unknown)}</DetailField>
    </dl>
    {row.content_url?.trim() ? <div className={styles.subsection}>
      <h3>{t('adminCampaignDetail.cover')}</h3>
      <CreativeAsset key={'cover:' + row.content_url} source={row.content_url} video={false} />
      <dl className={styles.fields}><DetailField full label={t('adminCampaignDetail.coverFilename')}>{row.cover_original_filename?.trim() || unknown}</DetailField></dl>
    </div> : null}
  </section>;
}
