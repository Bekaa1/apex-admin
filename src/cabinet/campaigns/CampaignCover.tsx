import { Icon } from '../../design-system';

/** 16:9 campaign cover; without an image it shows the logo-gradient placeholder with a play mark. */
export function CampaignCover({ url, tone }: { url: string | null; tone: 1 | 2 | 3 }) {
  return (
    <span className={`cmp-cover cmp-cover--md cab-thumb--${tone}`} aria-hidden="true">
      {url ? <img src={url} alt="" /> : <Icon name="play" size={16} />}
    </span>
  );
}
