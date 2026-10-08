import type { ReactNode } from 'react';
import { Icon } from '../../design-system';
import { COVER_PLAY_ICON, type CoverSize, type CoverTone } from '../campaignCover';

/** The uploaded cover; without one, the video's first frame, as the wizard promises («Без обложки покажем первый кадр ролика»). */
export function CoverMedia({ url, videoUrl }: { url: string | null; videoUrl?: string | null }) {
  if (url) return <img src={url} alt="" />;
  // With `#t` browsers paint that frame without playing; until it loads, or when the codec isn't supported, the placeholder shows through.
  if (videoUrl) return <video src={`${videoUrl}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} />;
  return null;
}

interface CampaignCoverProps {
  url: string | null;
  videoUrl?: string | null;
  tone: CoverTone;
  size?: CoverSize;
  /** Drawn on top, e.g. the duration. */
  children?: ReactNode;
}

/** 16:9 campaign cover over the logo-gradient placeholder with a play mark. */
export function CampaignCover({ url, videoUrl, tone, size = 'md', children }: CampaignCoverProps) {
  return (
    <span className={`cmp-cover cmp-cover--${size} cab-thumb--${tone}`} aria-hidden="true">
      <CoverMedia url={url} videoUrl={videoUrl} />
      {url ? null : <Icon name="play" size={COVER_PLAY_ICON[size]} />}
      {children}
    </span>
  );
}
