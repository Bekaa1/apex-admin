import { TARIFFS, type TariffCode } from '../../tariffs';
import type { StepId, WizardFlow } from './types';

/** All steps in order; the URL keeps the position (?step=1…5) even when a step is skipped. */
const STEPS: Record<WizardFlow, StepId[]> = {
  new: ['media', 'tariff', 'stores', 'zones', 'budget'],
  edit: ['media', 'tariff', 'stores', 'zones', 'review'],
};

export function allSteps(flow: WizardFlow): StepId[] {
  return STEPS[flow];
}

/** Shelf zones only matter for plans with zones; before a plan is chosen the step is shown. */
export function skipsZones(tariff: TariffCode | null): boolean {
  return TARIFFS.find((t) => t.code === tariff)?.hasZones === false;
}

/** Steps the advertiser goes through: «Зоны» is skipped for plans without zones, «Тариф» in an edit (the plan stays). */
export function isSkipped(flow: WizardFlow, step: StepId, tariff: TariffCode | null): boolean {
  return (step === 'zones' && skipsZones(tariff)) || (step === 'tariff' && flow === 'edit');
}

export function activeSteps(flow: WizardFlow, tariff: TariffCode | null): StepId[] {
  return STEPS[flow].filter((step) => !isSkipped(flow, step, tariff));
}

export function stepFromParam(flow: WizardFlow, value: string | null): StepId {
  return STEPS[flow][Number(value) - 1] ?? 'media';
}

export function stepParam(flow: WizardFlow, step: StepId): string {
  return String(STEPS[flow].indexOf(step) + 1);
}

export function nextStep(flow: WizardFlow, step: StepId, tariff: TariffCode | null): StepId | null {
  const steps = activeSteps(flow, tariff);
  return steps[steps.indexOf(step) + 1] ?? null;
}

export function prevStep(flow: WizardFlow, step: StepId, tariff: TariffCode | null): StepId | null {
  const steps = activeSteps(flow, tariff);
  return steps[steps.indexOf(step) - 1] ?? null;
}
