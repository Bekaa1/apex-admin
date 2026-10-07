import { Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { nextStep, prevStep } from './steps';
import type { CampaignForm, StepId } from './types';

interface WizardActionsProps {
  step: StepId;
  form: CampaignForm;
  submitting: boolean;
  onBack: () => void;
}

/** «Назад» and «Далее: <step>» / «Отправить на проверку»; sticks to the bottom of the screen. The form's submit runs «Далее». */
export function WizardActions({ step, form, submitting, onBack }: WizardActionsProps) {
  const { t } = useI18n();
  const next = nextStep(step, form.tariff);
  return (
    <div className="cmp-actions">
      {prevStep(step, form.tariff) ? (
        <Button variant="ghost" size="lg" iconLeft="arrow-left" onClick={onBack}>
          {t('campaigns.wizard.prev')}
        </Button>
      ) : null}
      {next ? (
        <Button type="submit" variant="primary" size="lg" iconRight="arrow-right" className="cmp-actions__next">
          <span className="cmp-next__long">{t('campaigns.wizard.next', { step: t(`campaigns.steps.${next}`) })}</span>
          <span className="cmp-next__short">{t('campaigns.wizard.nextShort')}</span>
        </Button>
      ) : (
        <Button type="submit" variant="primary" size="lg" iconLeft="send" className="cmp-actions__next" loading={submitting}>
          {t('campaigns.wizard.submit')}
        </Button>
      )}
    </div>
  );
}
