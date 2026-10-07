import type { StepId, WizardFlow } from './types';

/** All steps in order; the URL keeps the position (?step=1…5) even when a step is skipped. */
const STEPS: Record<WizardFlow, StepId[]> = {
  new: ['media', 'tariff', 'stores', 'zones', 'budget'],
  edit: ['media', 'tariff', 'stores', 'zones', 'review'],
};

export function allSteps(flow: WizardFlow): StepId[] {
  return STEPS[flow];
}

/**
 * Steps the advertiser goes through: «Зоны» is skipped for plans without shelf zones, «Тариф» in an edit (the plan stays).
 * `zones` is null before a plan is chosen: the zones step is shown then.
 */
export function isSkipped(flow: WizardFlow, step: StepId, zones: boolean | null): boolean {
  return (step === 'zones' && zones === false) || (step === 'tariff' && flow === 'edit');
}

export function activeSteps(flow: WizardFlow, zones: boolean | null): StepId[] {
  return STEPS[flow].filter((step) => !isSkipped(flow, step, zones));
}

export function stepFromParam(flow: WizardFlow, value: string | null): StepId {
  return STEPS[flow][Number(value) - 1] ?? 'media';
}

export function stepParam(flow: WizardFlow, step: StepId): string {
  return String(STEPS[flow].indexOf(step) + 1);
}

export function nextStep(flow: WizardFlow, step: StepId, zones: boolean | null): StepId | null {
  const steps = activeSteps(flow, zones);
  return steps[steps.indexOf(step) + 1] ?? null;
}

export function prevStep(flow: WizardFlow, step: StepId, zones: boolean | null): StepId | null {
  const steps = activeSteps(flow, zones);
  return steps[steps.indexOf(step) - 1] ?? null;
}
