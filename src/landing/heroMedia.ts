import { supabase } from '../lib/supabase';

// The landing video lives in the public Storage bucket `landing`, served through the Supabase CDN.
// A new cut goes into a new version folder, so neither the CDN nor browsers keep showing the old one.
// H.264 only: at the same size it kept the source closer than VP9 (SSIM 0.98 vs 0.95) and plays everywhere.
const BUCKET = 'landing';
const FOLDER = 'hero/v1';
/** Phones get the lighter 720p files; the same breakpoint as the landing layout. */
const PHONE = '(max-width: 760px)';

export interface MediaSource {
  src: string;
  type: 'video/mp4';
  media?: string;
}

export interface HeroMedia {
  poster: { src: string; srcSet: string };
  /** 0:40–1:10 without sound, played in a loop behind the first screen. */
  loop: MediaSource[];
  /** The whole video with sound, opened by «Смотреть видео». */
  full: MediaSource[];
}

export function heroMedia(): HeroMedia | null {
  if (!supabase) return null;
  const storage = supabase.storage.from(BUCKET);
  const url = (file: string) => storage.getPublicUrl(`${FOLDER}/${file}`).data.publicUrl;
  return {
    poster: { src: url('poster.jpg'), srcSet: `${url('poster-960.jpg')} 960w, ${url('poster.jpg')} 1920w` },
    loop: [
      { src: url('loop-720.mp4'), type: 'video/mp4', media: PHONE },
      { src: url('loop-1080.mp4'), type: 'video/mp4' },
    ],
    full: [
      { src: url('full-720.mp4'), type: 'video/mp4', media: PHONE },
      { src: url('full-1080.mp4'), type: 'video/mp4' },
    ],
  };
}
