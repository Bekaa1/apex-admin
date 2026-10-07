import { termsOf } from '../../tariffs';
import { campaignChanges } from './changes';
import { activeSteps } from './steps';
import type { CampaignForm, MediaProblem, MediaState, StepId, WizardCatalog, WizardContext } from './types';

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 300;

export type FieldKey = 'name' | 'video' | 'cover' | 'tariff' | 'stores' | 'zones' | 'budget' | 'changes' | 'rules';
export type FieldError = 'required' | 'tooLong' | 'uploading' | 'min' | 'unavailable' | MediaProblem;
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

export function minimumBudget(form: CampaignForm, catalog: WizardCatalog): number | null {
  return termsOf(catalog.tariffs, form.tariff)?.minimum ?? null;
}

/** An edit with no changes compared with `ctx.original` can't be sent. */
export function validateStep(step: StepId, form: CampaignForm, ctx: WizardContext): StepErrors {
  const { catalog } = ctx;
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
      // A plan taken off sale while the form waited in the tab.
      else if (!termsOf(catalog.tariffs, form.tariff)) errors.tariff = 'unavailable';
      break;
    case 'stores':
      if (!form.storeIds.length) errors.stores = 'required';
      break;
    case 'zones':
      if (storesWithoutZones(form, catalog).length) errors.zones = 'required';
      break;
    case 'budget': {
      const minimum = minimumBudget(form, catalog);
      if (form.budget === null) errors.budget = 'required';
      else if (minimum !== null && form.budget < minimum) errors.budget = 'min';
      if (!form.rulesAccepted) errors.rules = 'required';
      break;
    }
    case 'review':
      if (ctx.original && !campaignChanges(ctx.original, form, ctx).length) errors.changes = 'required';
      if (!form.rulesAccepted) errors.rules = 'required';
      break;
  }
  return errors;
}

export function isStepValid(step: StepId, form: CampaignForm, ctx: WizardContext): boolean {
  return Object.keys(validateStep(step, form, ctx)).length === 0;
}

/** The first step with missing data: the wizard never opens a later step than this one. */
export function firstInvalidStep(form: CampaignForm, ctx: WizardContext): StepId | null {
  return activeSteps(ctx.flow, ctx.zones).find((step) => !isStepValid(step, form, ctx)) ?? null;
}

/** The step to show: the requested one, but never past the first step with missing data; a skipped step opens the last one. */
export function reachableStep(requested: StepId, form: CampaignForm, ctx: WizardContext): StepId {
  const steps = activeSteps(ctx.flow, ctx.zones);
  const wanted = steps.includes(requested) ? requested : steps[steps.length - 1];
  const invalid = firstInvalidStep(form, ctx);
  return invalid && steps.indexOf(wanted) > steps.indexOf(invalid) ? invalid : wanted;
}
