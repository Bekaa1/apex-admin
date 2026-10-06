import { skipsZones } from './steps';
import type { CampaignForm, CampaignPrefill, CatalogStore, CatalogZone, WizardCatalog } from './types';
import { EMPTY_FORM } from './reducer';
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

export function summarize(form: CampaignForm, catalog: WizardCatalog): WizardSummary {
  const stores = selectedStores(form, catalog);
  const zones = selectedZones(form, catalog);
  return {
    stores: stores.length,
    carts: stores.every((store) => store.carts !== null) ? stores.reduce((sum, store) => sum + (store.carts ?? 0), 0) : null,
    zones: skipsZones(form.tariff) ? null : { count: zones.length, storesWithZones: new Set(zones.map((zone) => zone.storeId)).size },
    minimum: minimumBudget(form),
  };
}

/** Form for «Исправить» and «Повторить». A placeholder store («Все магазины») or a store that is gone means every store. */
export function formFromPrefill(prefill: CampaignPrefill, catalog: WizardCatalog): CampaignForm {
  const { storeId } = prefill;
  let storeIds: string[] = [];
  if (storeId !== null) storeIds = catalog.stores.some((store) => store.id === storeId) ? [storeId] : catalog.stores.map((store) => store.id);
  const zoneIds = prefill.zoneIds.filter((id) => catalog.zones.some((zone) => zone.id === id && storeIds.includes(zone.storeId)));
  return { ...EMPTY_FORM, name: prefill.name, video: prefill.video, cover: prefill.cover, budget: prefill.budget, storeIds, zoneIds };
}
