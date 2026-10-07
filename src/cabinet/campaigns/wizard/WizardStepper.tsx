import { Stepper, type StepperState } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { activeSteps, skipsZones, STEP_IDS } from './steps';
import type { CampaignForm, StepId, WizardCatalog } from './types';
import { firstInvalidStep } from './validation';

interface WizardStepperProps {
  step: StepId;
  form: CampaignForm;
  catalog: WizardCatalog;
  onStepClick: (step: StepId) => void;
}

/** A step is done when it and every step before it have what they need; done steps lead back to themselves. */
export function WizardStepper({ step, form, catalog, onStepClick }: WizardStepperProps) {
  const { t } = useI18n();
  const steps = activeSteps(form.tariff);
  const invalid = firstInvalidStep(form, catalog);
  const doneBefore = invalid ? steps.indexOf(invalid) : steps.length;

  const stateOf = (id: StepId): StepperState => {
    if (id === 'zones' && skipsZones(form.tariff)) return 'skipped';
    if (id === step) return 'current';
    return steps.indexOf(id) < doneBefore ? 'done' : 'todo';
  };

  return (
    <Stepper
      label={t('campaigns.stepsLabel')}
      countText={t('campaigns.wizard.stepOf', { n: steps.indexOf(step) + 1, total: steps.length })}
      stateLabels={{
        done: t('campaigns.wizard.stepState.done'),
        current: t('campaigns.wizard.stepState.current'),
        todo: t('campaigns.wizard.stepState.todo'),
        skipped: t('campaigns.wizard.stepState.skipped'),
      }}
      steps={STEP_IDS.map((id) => {
        const state = stateOf(id);
        return { key: id, label: t(`campaigns.steps.${id}`), state, note: state === 'skipped' ? t('campaigns.wizard.skippedNote') : undefined };
      })}
      onStepClick={(key) => {
        const target = STEP_IDS.find((id) => id === key);
        if (target) onStepClick(target);
      }}
    />
  );
}
