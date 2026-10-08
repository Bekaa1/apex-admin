import { useId } from 'react';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber } from '../../../lib/format';
import { CampaignCover } from '../../ui/CampaignCover';
import { VideoCover } from '../../ui/VideoCover';
import { formatClock } from '../wizard/media';
import type { CampaignDetails } from './types';

export function DetailsMedia({ details }: { details: CampaignDetails }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const { media } = details;
  const video = [
    media.video,
    media.durationSec ? t('campaigns.wizard.seconds', { n: formatNumber(media.durationSec, lang) }) : null,
    media.width && media.height ? `${media.width}×${media.height}` : null,
  ].filter(Boolean);
  const time = media.durationSec ? <span className="cmp-cover__time">{formatClock(media.durationSec)}</span> : null;

  return (
    <section className="cab-card cmpd-card cmpd-card--media" aria-labelledby={titleId}>
      <h2 className="cab-h3" id={titleId}>
        {t('campaigns.details.media.title')}
      </h2>
      <div className="cmpd-media">
        {media.videoUrl ? (
          <VideoCover src={media.videoUrl} cover={details.coverUrl} tone={details.coverTone} size="xl">
            {time}
          </VideoCover>
        ) : (
          <CampaignCover url={details.coverUrl} tone={details.coverTone} size="xl">
            {time}
          </CampaignCover>
        )}
        <dl className="cmpd-facts">
          <div>
            <dt>{t('campaigns.details.media.video')}</dt>
            <dd>{video.length ? video.join(' · ') : <span className="cab-subtle">—</span>}</dd>
          </div>
          <div>
            <dt>{t('campaigns.details.media.cover')}</dt>
            <dd>{details.coverUrl ? (media.cover ?? t('campaigns.details.media.coverUploaded')) : <span className="cab-muted">{t('campaigns.details.media.firstFrame')}</span>}</dd>
          </div>
          {media.description ? (
            <div>
              <dt>{t('campaigns.details.media.description')}</dt>
              <dd>{media.description}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
