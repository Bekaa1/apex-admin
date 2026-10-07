import { Stepper, type StepperState } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { activeSteps, allSteps, isSkipped } from './steps';
import type { CampaignForm, StepId, WizardContext } from './types';
import { firstInvalidStep } from './validation';

interface WizardStepperProps {
  step: StepId;
  form: CampaignForm;
  ctx: WizardContext;
  onStepClick: (step: StepId) => void;
}

/** A step is done when it and every step before it have what they need; done steps lead back to themselves. */
export function WizardStepper({ step, form, ctx, onStepClick }: WizardStepperProps) {
  const { t } = useI18n();
  const { flow } = ctx;
  const steps = activeSteps(flow, ctx.zones);
  const invalid = firstInvalidStep(form, ctx);
  const doneBefore = invalid ? steps.indexOf(invalid) : steps.length;

  const stateOf = (id: StepId): StepperState => {
    if (isSkipped(flow, id, ctx.zones)) return 'skipped';
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
      steps={allSteps(flow).map((id) => {
        const state = stateOf(id);
        const note = id === 'tariff' ? t('campaigns.edit.tariffNote') : t('campaigns.wizard.skippedNote');
        return { key: id, label: t(`campaigns.steps.${id}`), state, note: state === 'skipped' ? note : undefined };
      })}
      onStepClick={(key) => {
        const target = allSteps(flow).find((id) => id === key);
        if (target) onStepClick(target);
      }}
    />
  );
}
