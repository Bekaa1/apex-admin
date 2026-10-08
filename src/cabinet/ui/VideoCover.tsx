import { useRef, type ReactNode } from 'react';
import { cx, IconButton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';

interface VideoCoverProps {
  src: string;
  poster?: string;
  /** Cover classes (`cmp-cover cmp-cover--… cab-thumb--…`). */
  className: string;
  children: ReactNode;
}

/** A campaign cover that opens the video in the browser's own player. Nothing loads until it is opened; closing pauses it. */
export function VideoCover({ src, poster, className, children }: VideoCoverProps) {
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
      <button type="button" className={cx(className, 'cab-cover-btn')} aria-label={t('cabinet.video.watch')} title={t('cabinet.video.watch')} onClick={open}>
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
        <video ref={videoRef} className="cab-player__video" src={src} poster={poster} controls playsInline preload="none" />
        <IconButton className="cab-player__close" icon="x" label={t('cabinet.video.close')} onClick={() => dialogRef.current?.close()} />
      </dialog>
    </>
  );
}
