import { Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { ButtonLink } from '../../ui/ButtonLink';
import { nextStep, prevStep } from './steps';
import type { StepId, WizardFlow } from './types';

interface WizardActionsProps {
  flow: WizardFlow;
  step: StepId;
  /** The plan has shelf zones; null before a plan is chosen. */
  zones: boolean | null;
  submitting: boolean;
  onBack: () => void;
  /** «Отменить изменения» of an edit: back to the campaign without the draft. */
  cancel: { to: string; onClick: () => void } | null;
}

/** «Назад» and «Далее: <step>» / «Отправить на проверку»; sticks to the bottom of the screen. The form's submit runs «Далее». */
export function WizardActions({ flow, step, zones, submitting, onBack, cancel }: WizardActionsProps) {
  const { t } = useI18n();
  const next = nextStep(flow, step, zones);
  return (
    <div className="cmp-actions">
      {prevStep(flow, step, zones) ? (
        <Button variant="ghost" size="lg" iconLeft="arrow-left" onClick={onBack}>
          {t('campaigns.wizard.prev')}
        </Button>
      ) : null}
      {cancel ? (
        <ButtonLink className="cmp-actions__save" to={cancel.to} onClick={cancel.onClick} variant="secondary" size="lg">
          {t('campaigns.edit.cancel')}
        </ButtonLink>
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
