import { selectedStores, selectedZones } from './summary';
import type { CampaignForm, CatalogStore, CatalogZone, MediaState, WizardContext } from './types';

export interface MediaRef {
  fileName: string;
  durationSec: number | null;
}

export interface ZoneCount {
  count: number;
  storesWithZones: number;
  stores: number;
}

/** One «было → стало» line of «Проверка изменений». */
export type CampaignChange =
  | { field: 'name' | 'description'; was: string; now: string }
  | { field: 'video'; was: MediaRef | null; now: MediaRef | null }
  | { field: 'cover'; was: string | null; now: string | null }
  | { field: 'stores'; was: number; now: number; added: CatalogStore[]; removed: CatalogStore[] }
  | { field: 'zones'; was: ZoneCount; now: ZoneCount };

const mediaUrl = (media: MediaState): string | null => (media.status === 'ready' ? media.url : null);

function mediaRef(media: MediaState): MediaRef | null {
  return media.status === 'ready' ? { fileName: media.fileName, durationSec: media.meta?.durationSec ?? null } : null;
}

function zoneCount(zones: CatalogZone[], stores: number): ZoneCount {
  return { count: zones.length, storesWithZones: new Set(zones.map((zone) => zone.storeId)).size, stores };
}

/** What the edit changes compared with the campaign as it was opened. The plan and the budget can't change here. */
export function campaignChanges(original: CampaignForm, form: CampaignForm, ctx: WizardContext): CampaignChange[] {
  const { catalog } = ctx;
  const changes: CampaignChange[] = [];
  const name = { was: original.name.trim(), now: form.name.trim() };
  if (name.was !== name.now) changes.push({ field: 'name', ...name });
  const description = { was: original.description.trim(), now: form.description.trim() };
  if (description.was !== description.now) changes.push({ field: 'description', ...description });
  if (mediaUrl(original.video) !== mediaUrl(form.video)) changes.push({ field: 'video', was: mediaRef(original.video), now: mediaRef(form.video) });
  if (mediaUrl(original.cover) !== mediaUrl(form.cover)) {
    changes.push({ field: 'cover', was: mediaRef(original.cover)?.fileName ?? null, now: mediaRef(form.cover)?.fileName ?? null });
  }

  const wasStores = selectedStores(original, catalog);
  const nowStores = selectedStores(form, catalog);
  const added = nowStores.filter((store) => !original.storeIds.includes(store.id));
  const removed = wasStores.filter((store) => !form.storeIds.includes(store.id));
  if (added.length || removed.length) changes.push({ field: 'stores', was: wasStores.length, now: nowStores.length, added, removed });

  if (ctx.zones !== false) {
    const wasZones = selectedZones(original, catalog);
    const nowZones = selectedZones(form, catalog);
    const before = new Set(wasZones.map((zone) => zone.id));
    if (wasZones.length !== nowZones.length || nowZones.some((zone) => !before.has(zone.id))) {
      changes.push({ field: 'zones', was: zoneCount(wasZones, wasStores.length), now: zoneCount(nowZones, nowStores.length) });
    }
  }
  return changes;
}
