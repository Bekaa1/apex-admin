import { TARIFFS } from '../../tariffs';
import { activeSteps } from './steps';
import type { CampaignForm, MediaProblem, MediaState, StepId, WizardCatalog } from './types';

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 300;

export type FieldKey = 'name' | 'video' | 'cover' | 'tariff' | 'stores' | 'zones' | 'budget' | 'rules';
export type FieldError = 'required' | 'tooLong' | 'uploading' | 'min' | MediaProblem;
export type StepErrors = Partial<Record<FieldKey, FieldError>>;

function mediaError(media: MediaState, required: boolean): FieldError | undefined {
  switch (media.status) {
    case 'empty':
      return required ? 'required' : undefined;
    case 'uploading':
      return 'uploading';
    case 'failed':
      return media.problem;
    case 'ready':
      return undefined;
  }
}

/** Selected stores that have no selected zone (step 4 requires one in every store). */
export function storesWithoutZones(form: CampaignForm, catalog: WizardCatalog): string[] {
  const chosen = new Set(form.zoneIds);
  return form.storeIds.filter((storeId) => !catalog.zones.some((zone) => zone.storeId === storeId && chosen.has(zone.id)));
}

export function minimumBudget(form: CampaignForm): number | null {
  return TARIFFS.find((tariff) => tariff.code === form.tariff)?.minimum ?? null;
}

export function validateStep(step: StepId, form: CampaignForm, catalog: WizardCatalog): StepErrors {
  const errors: StepErrors = {};
  const set = (key: FieldKey, error: FieldError | undefined) => {
    if (error) errors[key] = error;
  };
  switch (step) {
    case 'media': {
      const name = form.name.trim();
      if (!name) errors.name = 'required';
      else if (name.length > NAME_MAX) errors.name = 'tooLong';
      set('video', mediaError(form.video, true));
      set('cover', mediaError(form.cover, false));
      break;
    }
    case 'tariff':
      if (!form.tariff) errors.tariff = 'required';
      break;
    case 'stores':
      if (!form.storeIds.length) errors.stores = 'required';
      break;
    case 'zones':
      if (storesWithoutZones(form, catalog).length) errors.zones = 'required';
      break;
    case 'budget': {
      const minimum = minimumBudget(form);
      if (form.budget === null) errors.budget = 'required';
      else if (minimum !== null && form.budget < minimum) errors.budget = 'min';
      if (!form.rulesAccepted) errors.rules = 'required';
      break;
    }
  }
  return errors;
}

export function isStepValid(step: StepId, form: CampaignForm, catalog: WizardCatalog): boolean {
  return Object.keys(validateStep(step, form, catalog)).length === 0;
}

/** The first step with missing data: the wizard never opens a later step than this one. */
export function firstInvalidStep(form: CampaignForm, catalog: WizardCatalog): StepId | null {
  return activeSteps(form.tariff).find((step) => !isStepValid(step, form, catalog)) ?? null;
}

/** The step to show: the requested one, but never past the first step with missing data; a skipped «Зоны» opens «Бюджет». */
export function reachableStep(requested: StepId, form: CampaignForm, catalog: WizardCatalog): StepId {
  const steps = activeSteps(form.tariff);
  const wanted = steps.includes(requested) ? requested : 'budget';
  const invalid = firstInvalidStep(form, catalog);
  return invalid && steps.indexOf(wanted) > steps.indexOf(invalid) ? invalid : wanted;
}
