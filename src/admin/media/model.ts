import type { Database } from '../../lib/database.types';

/** Source contract, generated from Supabase; deliberately no count/paging fields. */
export type OrphanMediaRpcRow = Database['public']['Functions']['admin_campaign_media_orphans']['Returns'][number];
export interface MediaFile {
  name: OrphanMediaRpcRow['name'] | null;
  sizeBytes: OrphanMediaRpcRow['size_bytes'] | null;
  createdAt: number | null;
}
export type MediaErrorKind = 'missing' | 'denied' | 'unavailable' | 'invalidResponse';
export type MediaSort = 'server' | 'nameAsc' | 'nameDesc' | 'sizeDesc' | 'newest';

export class MediaLoadError extends Error {
  readonly kind: MediaErrorKind;
  constructor(kind: MediaErrorKind) {
    super('Media metadata request failed');
    this.name = 'MediaLoadError';
    this.kind = kind;
  }
}

export function mediaErrorKind(code: string | undefined, status: number): MediaErrorKind {
  if (status === 401 || status === 403 || code === '42501') return 'denied';
  if (code === 'PGRST202' || code === '42883') return 'missing';
  return 'unavailable';
}

export function validSize(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Validate the actual response, despite the non-nullable generated declaration. */
export function parseMediaFiles(value: unknown): MediaFile[] {
  if (!Array.isArray(value)) throw new MediaLoadError('invalidResponse');
  return value.map((row: unknown) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new MediaLoadError('invalidResponse');
    const data = row as Record<string, unknown>;
    const date = typeof data.created_at === 'string' && data.created_at.trim() ? Date.parse(data.created_at) : NaN;
    return {
      name: typeof data.name === 'string' && data.name.trim() ? data.name : null,
      sizeBytes: validSize(data.size_bytes),
      createdAt: Number.isFinite(date) ? date : null,
    };
  });
}

export function formatMediaSize(value: number | null, locale: string, unknown: string): string {
  const size = validSize(value);
  if (size === null) return unknown;
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
  let amount = size;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit += 1; }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: unit ? 2 : 0 }).format(amount) + '\u00a0' + units[unit];
}

export function formatMediaDate(value: number | null, locale: string, unknown: string): string {
  if (value === null || !Number.isFinite(value)) return unknown;
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'medium' }).format(value);
}

export function visibleMedia(files: MediaFile[], search: string, sort: MediaSort, locale: string): MediaFile[] {
  const needle = search.trim().toLocaleLowerCase(locale);
  const filtered = files.filter((file) => !needle || file.name?.toLocaleLowerCase(locale).includes(needle));
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  return filtered.sort((a, b) => {
    if (sort === 'server') return 0;
    if (sort === 'nameAsc' || sort === 'nameDesc') {
      if (a.name === null) return b.name === null ? 0 : 1;
      if (b.name === null) return -1;
      return collator.compare(a.name, b.name) * (sort === 'nameDesc' ? -1 : 1);
    }
    const first = sort === 'sizeDesc' ? a.sizeBytes : a.createdAt;
    const second = sort === 'sizeDesc' ? b.sizeBytes : b.createdAt;
    if (first === null) return second === null ? 0 : 1;
    return second === null ? -1 : second - first;
  });
}
