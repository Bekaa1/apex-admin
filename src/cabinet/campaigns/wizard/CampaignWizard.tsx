import { useEffect, useId, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Alert, Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { clearCampaignIntent } from '../../../lib/campaignIntent';
import { CABINET_LINKS } from '../../sections';
import { activeSteps } from './steps';
import { StepBudget } from './steps/StepBudget';
import { StepMedia } from './steps/StepMedia';
import { StepStores } from './steps/StepStores';
import { StepTariff } from './steps/StepTariff';
import { StepZones } from './steps/StepZones';
import { useCampaignWizard, type WizardOptions } from './useCampaignWizard';
import { ReturnedAlert } from './ReturnedAlert';
import { SubmitError } from './SubmitError';
import { WizardActions } from './WizardActions';
import { WizardHelp } from './WizardHelp';
import { WizardStepper } from './WizardStepper';
import { WizardSummary } from './WizardSummary';

export function CampaignWizard(options: WizardOptions) {
  const { t } = useI18n();
  const { catalog, mode } = options;
  const wizard = useCampaignWizard(options);
  const { step, form } = wizard;
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);
  const [params, setParams] = useSearchParams();
  const steps = activeSteps(form.tariff);
  const hasErrors = Object.keys(wizard.errors).length > 0;
  const moderation = mode.kind === 'fix' ? mode.moderation : null;

  // Once initialized, the saved form wins over a copy or a choice from the public catalog on reload.
  const hasPrefill = params.has('copy') || params.has('tariff') || params.has('store');
  useEffect(() => {
    if (mode.kind === 'new') clearCampaignIntent();
    if (!hasPrefill) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('copy');
        next.delete('tariff');
        next.delete('store');
        return next;
      },
      { replace: true },
    );
  }, [hasPrefill, mode.kind, setParams]);

  // A new step starts at the top, and screen readers land on its title.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (wizard.attempts > 0) errorsRef.current?.focus();
  }, [wizard.attempts]);

  return (
    <div className="cmp-wizard">
      <Link className="cab-link cmp-back" to={CABINET_LINKS.campaigns}>
        <Icon name="arrow-left" size={18} />
        {t('campaigns.wizard.back')}
      </Link>
      <div className="cab-card cmp-wizard__stepper">
        <WizardStepper step={step} form={form} catalog={catalog} onStepClick={wizard.goTo} />
      </div>
      {mode.kind === 'fix' ? <ReturnedAlert moderation={moderation} /> : null}
      <div className="cmp-wizard__grid">
        <form
          className="cmp-wizard__main"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 'budget') wizard.submit();
            else wizard.next();
          }}
        >
          <section className="cab-card cmp-step" aria-labelledby={titleId}>
            <header className="cmp-step__head">
              <p className="cab-overline">{t('campaigns.wizard.stepOf', { n: steps.indexOf(step) + 1, total: steps.length })}</p>
              <h2 className="cab-h2" id={titleId} ref={headingRef} tabIndex={-1}>
                {t(`campaigns.wizard.${step}.title`)}
              </h2>
              <p className="cab-lead">{t(`campaigns.wizard.${step}.lead`)}</p>
            </header>
            {hasErrors ? (
              <div key={wizard.attempts} ref={errorsRef} tabIndex={-1} className="cmp-step__errors">
                <Alert tone="danger" title={t('campaigns.wizard.fixErrors')} />
              </div>
            ) : null}
            {step === 'media' ? <StepMedia wizard={wizard} /> : null}
            {step === 'tariff' ? <StepTariff wizard={wizard} /> : null}
            {step === 'stores' ? <StepStores wizard={wizard} catalog={catalog} /> : null}
            {step === 'zones' ? <StepZones wizard={wizard} catalog={catalog} /> : null}
            {step === 'budget' ? <StepBudget wizard={wizard} catalog={catalog} /> : null}
          </section>
          {wizard.submitError ? <SubmitError code={wizard.submitError} /> : null}
          <WizardActions step={step} form={form} submitting={wizard.submitting} onBack={wizard.back} />
        </form>
        <aside className="cmp-wizard__aside">
          <WizardSummary step={step} form={form} catalog={catalog} />
          <WizardHelp step={step} failedRules={moderation?.rules ?? []} />
        </aside>
      </div>
    </div>
  );
}
