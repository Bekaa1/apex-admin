import type { RefObject } from 'react';
import { IconButton } from '../design-system';
import { useI18n } from '../i18n/i18n';
import type { MediaSource } from './heroMedia';

interface VideoDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  sources: MediaSource[];
  poster: string;
  onClose: () => void;
}

/** The whole video with sound in the browser's own player. Nothing loads until it is opened; closing pauses it. */
export function VideoDialog({ dialogRef, videoRef, sources, poster, onClose }: VideoDialogProps) {
  const { t } = useI18n();
  return (
    <dialog
      ref={dialogRef}
      className="land__player"
      aria-label={t('landing.video.title')}
      onClose={() => {
        videoRef.current?.pause();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <video ref={videoRef} className="land__player-video" controls playsInline preload="none" poster={poster}>
        {sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} media={source.media} />
        ))}
      </video>
      <IconButton className="land__player-close" icon="x" label={t('landing.video.close')} onClick={() => dialogRef.current?.close()} />
    </dialog>
  );
}
