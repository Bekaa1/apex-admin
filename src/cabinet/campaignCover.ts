export type CoverTone = 1 | 2 | 3;

const COVER_TONES: CoverTone[] = [1, 2, 3];

/** Placeholder gradient of a campaign without a cover, picked from the id so it stays put while filtering. */
export function coverTone(id: string): CoverTone {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return COVER_TONES[sum % COVER_TONES.length];
}
