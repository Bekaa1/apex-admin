import { useRef, type ReactNode } from 'react';
import { Icon, IconButton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { COVER_PLAY_ICON, type CoverSize, type CoverTone } from '../campaignCover';
import { CoverMedia } from './CampaignCover';

interface VideoCoverProps {
  src: string;
  /** The uploaded cover; without one the video's first frame shows. */
  cover: string | null;
  tone: CoverTone;
  size: CoverSize;
  /** Drawn on top, e.g. the duration. */
  children?: ReactNode;
}

/** A campaign cover that opens the video in the browser's own player. The whole video loads only when opened; closing pauses it. */
export function VideoCover({ src, cover, tone, size, children }: VideoCoverProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const open = () => {
    const dialog = dialogRef.current;
    const video = videoRef.current;
    if (!dialog || !video) return;
    dialog.showModal();
    video.currentTime = 0;
    // Started inside the click, so browsers let it play with sound (Safari refuses a later autoplay).
    video.play().catch(() => undefined);
  };

  return (
    <>
      <button type="button" className={`cmp-cover cmp-cover--${size} cab-thumb--${tone} cab-cover-btn`} aria-label={t('cabinet.video.watch')} title={t('cabinet.video.watch')} onClick={open}>
        <CoverMedia url={cover} videoUrl={src} />
        <Icon name="play" size={COVER_PLAY_ICON[size]} />
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className="cab-player"
        aria-label={t('cabinet.video.title')}
        onClose={() => videoRef.current?.pause()}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <video ref={videoRef} className="cab-player__video" src={src} poster={cover ?? undefined} controls playsInline preload="none" />
        <IconButton className="cab-player__close" icon="x" label={t('cabinet.video.close')} onClick={() => dialogRef.current?.close()} />
      </dialog>
    </>
  );
}
