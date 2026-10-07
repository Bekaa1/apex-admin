import { skipsZones } from './steps';
import type { CampaignForm, CampaignPrefill, CatalogStore, CatalogZone, WizardCatalog } from './types';
import { emptyForm } from './reducer';
import { minimumBudget } from './validation';

/** Quick budget amounts: the plan minimum and two steps above it (2, 3 and 5 million for «Премиум»). */
const PRESET_FACTORS = [1, 1.5, 2.5];

export function budgetPresets(minimum: number): number[] {
  return PRESET_FACTORS.map((factor) => Math.round(minimum * factor));
}

export function selectedStores(form: CampaignForm, catalog: WizardCatalog): CatalogStore[] {
  return catalog.stores.filter((store) => form.storeIds.includes(store.id));
}

/** Chosen zones of the chosen stores; zones of a store that was unticked stay in the form but don't count. */
export function selectedZones(form: CampaignForm, catalog: WizardCatalog): CatalogZone[] {
  return catalog.zones.filter((zone) => form.zoneIds.includes(zone.id) && form.storeIds.includes(zone.storeId));
}

export interface WizardSummary {
  stores: number;
  /** Carts of the chosen stores; null while the backend doesn't share cart counts. */
  carts: number | null;
  /** null — the plan has no shelf zones. */
  zones: { count: number; storesWithZones: number } | null;
  minimum: number | null;
}

/** Cart counts and campaigns per store come with the backend's store catalog; until then these columns stay hidden. */
export const knowsCarts = (catalog: WizardCatalog): boolean => catalog.stores.every((store) => store.carts !== null);
export const knowsStoreLoad = (catalog: WizardCatalog): boolean => catalog.stores.every((store) => store.activeCampaigns !== null);

export function summarize(form: CampaignForm, catalog: WizardCatalog): WizardSummary {
  const stores = selectedStores(form, catalog);
  const zones = selectedZones(form, catalog);
  return {
    stores: stores.length,
    carts: knowsCarts(catalog) ? stores.reduce((sum, store) => sum + (store.carts ?? 0), 0) : null,
    zones: skipsZones(form.tariff) ? null : { count: zones.length, storesWithZones: new Set(zones.map((zone) => zone.storeId)).size },
    minimum: minimumBudget(form),
  };
}

/** Form for «Исправить» and «Повторить». A placeholder store («Все магазины») or a store that is gone means every store. */
export function formFromPrefill(prefill: CampaignPrefill, catalog: WizardCatalog): CampaignForm {
  // Stores that left the catalog (no carts any more) are dropped; the advertiser picks again.
  const storeIds = prefill.storeIds.filter((id) => catalog.stores.some((store) => store.id === id));
  const zoneIds = prefill.zoneIds.filter((id) => catalog.zones.some((zone) => zone.id === id && storeIds.includes(zone.storeId)));
  return {
    ...emptyForm(),
    name: prefill.name,
    description: prefill.description,
    video: prefill.video,
    cover: prefill.cover,
    tariff: prefill.tariff,
    budget: prefill.budget,
    storeIds,
    zoneIds,
  };
}
