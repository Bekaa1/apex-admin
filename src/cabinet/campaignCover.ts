export type CoverTone = 1 | 2 | 3;

const COVER_TONES: CoverTone[] = [1, 2, 3];

/** Placeholder gradient of a campaign without a cover, picked from the id so it stays put while filtering. */
export function coverTone(id: string): CoverTone {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return COVER_TONES[sum % COVER_TONES.length];
}

export type CoverSize = 'sm' | 'md' | 'lg' | 'xl';

/** The play mark of a cover without an image. */
export const COVER_PLAY_ICON: Record<CoverSize, number> = { sm: 16, md: 16, lg: 22, xl: 28 };
