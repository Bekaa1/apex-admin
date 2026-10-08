import { useEffect, useRef, useState } from 'react';
import { cx, IconButton } from '../design-system';
import { useI18n } from '../i18n/i18n';
import type { HeroMedia } from './heroMedia';

/**
 * The muted loop behind the first screen. The poster shows at once and the video fades in when it plays.
 * It stops while off screen, in a hidden tab, while the full video is open (`held`) and after the pause button;
 * with «reduce motion» it does not start on its own.
 */
export function HeroVideo({ media, held }: { media: HeroMedia; held: boolean }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stopped, setStopped] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const [shown, setShown] = useState(false);
  const play = !stopped && !held && inView && pageVisible;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver((entries) => setInView(entries.some((entry) => entry.isIntersecting)));
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!play) {
      video.pause();
      return;
    }
    // React sets `muted` only as a property; browsers allow autoplay only for a video that is muted before play().
    video.muted = true;
    // A blocked autoplay (e.g. iOS low power mode) just leaves the poster.
    video.play().catch(() => undefined);
  }, [play]);

  return (
    <>
      <img
        className="land__poster"
        src={media.poster.src}
        srcSet={media.poster.srcSet}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        aria-hidden="true"
        onError={(event) => {
          // Without the poster the brand colour behind it shows instead of a broken-image icon.
          event.currentTarget.hidden = true;
        }}
      />
      <video
        ref={videoRef}
        className={cx('land__video', shown && 'is-shown')}
        muted
        loop
        playsInline
        preload={stopped ? 'none' : 'auto'}
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => setShown(true)}
      >
        {media.loop.map((source) => (
          <source key={source.src} src={source.src} type={source.type} media={source.media} />
        ))}
      </video>
      <IconButton
        className="land__video-toggle"
        icon={stopped ? 'play' : 'pause'}
        label={t(stopped ? 'landing.video.play' : 'landing.video.pause')}
        onClick={() => setStopped((value) => !value)}
      />
    </>
  );
}
