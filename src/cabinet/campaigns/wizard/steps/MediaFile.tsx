import { useRef, useState, type ReactNode } from 'react';
import { Button, Dialog, Icon, IconButton, Meter } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { CampaignCover } from '../../../ui/CampaignCover';
import { VideoCover } from '../../../ui/VideoCover';
import { formatClock } from '../media';
import type { MediaState } from '../types';
import { useMetaLine, useProblemText, useVideoRules } from './mediaText';

type FileMedia = Exclude<MediaState, { status: 'empty' }>;

interface MediaFileProps {
  kind: 'video' | 'cover';
  media: FileMedia;
  accept: string;
  /** Picked through «Заменить». */
  onFile: (file: File) => void;
  onRemove: () => void;
  coverTone?: 1 | 2 | 3;
}

/** A chosen file: thumbnail (a ready video plays from it), name and checks; while uploading — progress and «Отменить». */
export function MediaFile({ kind, media, accept, onFile, onRemove, coverTone = 1 }: MediaFileProps) {
  const { t } = useI18n();
  const replaceRef = useRef<HTMLInputElement>(null);
  const [dismissedError, setDismissedError] = useState<FileMedia | null>(null);
  const problemText = useProblemText();
  const videoRules = useVideoRules();
  const tooLong = kind === 'video' && media.status === 'failed' && media.problem === 'duration';
  const dismissError = () => setDismissedError(media);
  const metaLine = useMetaLine(media.meta);
  const duration = media.meta?.durationSec;
  const time = duration && media.status !== 'uploading' ? <span className="cmp-cover__time">{formatClock(duration)}</span> : null;
  let thumb: ReactNode;
  if (kind === 'cover') {
    thumb = (
      <span className={`cmp-cover cmp-cover--lg cab-thumb--${coverTone}`} aria-hidden="true">
        {media.status === 'ready' ? <img src={media.url} alt="" /> : <Icon name="image" size={22} />}
      </span>
    );
  } else if (media.status === 'ready') {
    thumb = (
      <VideoCover src={media.url} cover={null} tone={coverTone} size="lg">
        {time}
      </VideoCover>
    );
  } else {
    thumb = (
      <CampaignCover url={null} tone={coverTone} size="lg">
        {time}
      </CampaignCover>
    );
  }

  return (
    <div className={media.status === 'failed' ? 'cmp-file is-invalid' : 'cmp-file'}>
      <Dialog
        open={tooLong && dismissedError !== media}
        title={t('campaigns.wizard.media.durationTitle')}
        tone="danger"
        icon="alert-circle"
        closeLabel={t('campaigns.wizard.media.dismissError')}
        onClose={dismissError}
        actions={<Button data-autofocus onClick={dismissError}>{t('campaigns.wizard.media.dismissError')}</Button>}
      >
        {tooLong ? <p>{problemText('duration', kind, media.meta)}</p> : null}
        <p>{videoRules}</p>
      </Dialog>
      {thumb}
      <div className="cmp-file__body">
        <p className="cmp-file__name">{media.fileName}</p>
        {media.status === 'uploading' ? (
          <div className="cmp-file__progress">
            <Meter value={media.progress} size="sm" label={t('campaigns.wizard.media.uploading')} />
            <span>{t('campaigns.wizard.media.uploadingPct', { pct: media.progress })}</span>
          </div>
        ) : null}
        {media.status !== 'uploading' && metaLine ? <p className="cmp-file__meta">{metaLine}</p> : null}
        {media.status === 'ready' ? (
          <p className="cmp-file__ok">
            <Icon name="check-circle" size={18} />
            {t(kind === 'video' ? 'campaigns.wizard.media.videoOk' : 'campaigns.wizard.media.coverOk')}
          </p>
        ) : null}
        {media.status === 'failed' ? (
          <p className="ax-error">
            <Icon name="alert-circle" size={18} />
            <span>{problemText(media.problem, kind, media.meta)}</span>
          </p>
        ) : null}
      </div>
      <div className="cmp-file__actions">
        {media.status === 'uploading' ? (
          <Button variant="ghost" size="md" onClick={onRemove}>
            {t('campaigns.wizard.media.cancel')}
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="md" iconLeft="upload" onClick={() => replaceRef.current?.click()}>
              {t('campaigns.wizard.media.replace')}
            </Button>
            <IconButton variant="ghost" icon="trash" label={t('campaigns.wizard.media.remove')} onClick={onRemove} />
            <input
              ref={replaceRef}
              type="file"
              accept={accept}
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.target.value = '';
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
