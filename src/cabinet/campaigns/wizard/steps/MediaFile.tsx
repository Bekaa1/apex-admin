import { useRef } from 'react';
import { Button, Icon, IconButton, Meter } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatClock } from '../media';
import type { MediaState } from '../types';
import { useMetaLine, useProblemText } from './mediaText';

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

/** A chosen file: thumbnail, name and checks; while uploading — progress and «Отменить». */
export function MediaFile({ kind, media, accept, onFile, onRemove, coverTone = 1 }: MediaFileProps) {
  const { t } = useI18n();
  const replaceRef = useRef<HTMLInputElement>(null);
  const problemText = useProblemText();
  const metaLine = useMetaLine(media.meta);
  const duration = media.meta?.durationSec;
  const image = kind === 'cover' && media.status === 'ready' ? media.url : null;

  return (
    <div className={media.status === 'failed' ? 'cmp-file is-invalid' : 'cmp-file'}>
      <span className={`cmp-cover cmp-cover--lg cab-thumb--${coverTone}`} aria-hidden="true">
        {image ? <img src={image} alt="" /> : <Icon name={kind === 'video' ? 'play' : 'image'} size={22} />}
        {kind === 'video' && duration && media.status !== 'uploading' ? <span className="cmp-cover__time">{formatClock(duration)}</span> : null}
      </span>
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
