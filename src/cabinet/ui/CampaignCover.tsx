import { Icon } from '../../design-system';
import type { CoverTone } from '../campaignCover';

const PLAY_ICON = { sm: 16, md: 16, lg: 28 } as const;

/** 16:9 campaign cover; without an image it shows the logo-gradient placeholder with a play mark. */
export function CampaignCover({ url, tone, size = 'md' }: { url: string | null; tone: CoverTone; size?: keyof typeof PLAY_ICON }) {
  return (
    <span className={`cmp-cover cmp-cover--${size} cab-thumb--${tone}`} aria-hidden="true">
      {url ? <img src={url} alt="" /> : <Icon name="play" size={PLAY_ICON[size]} />}
    </span>
  );
}
