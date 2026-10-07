import { TARIFFS, type TariffCode } from '../../tariffs';
import type { StepId } from './types';

/** All steps in order; the URL keeps the position (?step=1…5) even when «Зоны» is skipped. */
export const STEP_IDS: StepId[] = ['media', 'tariff', 'stores', 'zones', 'budget'];

/** Shelf zones only matter for plans with zones; before a plan is chosen the step is shown. */
export function skipsZones(tariff: TariffCode | null): boolean {
  return TARIFFS.find((t) => t.code === tariff)?.hasZones === false;
}

export function activeSteps(tariff: TariffCode | null): StepId[] {
  return skipsZones(tariff) ? STEP_IDS.filter((step) => step !== 'zones') : STEP_IDS;
}

export function stepFromParam(value: string | null): StepId {
  return STEP_IDS[Number(value) - 1] ?? 'media';
}

export function stepParam(step: StepId): string {
  return String(STEP_IDS.indexOf(step) + 1);
}

export function nextStep(step: StepId, tariff: TariffCode | null): StepId | null {
  const steps = activeSteps(tariff);
  return steps[steps.indexOf(step) + 1] ?? null;
}

export function prevStep(step: StepId, tariff: TariffCode | null): StepId | null {
  const steps = activeSteps(tariff);
  return steps[steps.indexOf(step) - 1] ?? null;
}
