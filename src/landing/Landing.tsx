import { useId, useMemo, useRef, useState } from 'react';
import { Button } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { CampaignLink } from './CampaignLink';
import { heroMedia } from './heroMedia';
import { HeroVideo } from './HeroVideo';
import { VideoDialog } from './VideoDialog';

export function Landing() {
  const { t } = useI18n();
  const titleId = useId();
  const media = useMemo(() => heroMedia(), []);
  const playerRef = useRef<HTMLDialogElement>(null);
  const fullRef = useRef<HTMLVideoElement>(null);
  const [watching, setWatching] = useState(false);

  const openVideo = () => {
    const dialog = playerRef.current;
    const video = fullRef.current;
    if (!dialog || !video) return;
    dialog.showModal();
    setWatching(true);
    video.currentTime = 0;
    // Started inside the click, so browsers let it play with sound (Safari refuses a later autoplay).
    video.play().catch(() => undefined);
  };

  return (
    <>
      <section className="land__hero" aria-labelledby={titleId}>
        <HeroVideo media={media} held={watching} />
        <div className="land__copy">
          <p className="land__eyebrow"><span className="land__dot" aria-hidden="true" />{t('landing.hero.eyebrow')}</p>
          <h1 className="land__title" id={titleId}>{t('landing.hero.titleBefore')}<span className="land__accent">{t('landing.hero.titleAccent')}</span>{t('landing.hero.titleAfter')}</h1>
          <div className="land__ctas">
            <CampaignLink size="xl" iconRight="arrow-right">{t('landing.hero.ctaPrimary')}</CampaignLink>
            <Button size="xl" variant="secondary" className="land__watch" iconLeft="play" onClick={openVideo}>
              {t('landing.hero.watch')}
              <span className="land__watch-length"> · {t('landing.hero.watchLength')}</span>
            </Button>
          </div>
        </div>
      </section>
      <section className="land__intro">
        <p className="land__text">{t('landing.hero.text')}</p>
        <div className="land__stats">
          {[1, 2, 3].map((n) => <div className="land__stat" key={n}><p className="land__stat-value">{t('landing.stats.s' + n + 'Value')}</p><p className="land__stat-label">{t('landing.stats.s' + n + 'Label')}</p></div>)}
        </div>
      </section>
      <VideoDialog dialogRef={playerRef} videoRef={fullRef} sources={media.full} poster={media.poster.src} onClose={() => setWatching(false)} />
    </>
  );
}
