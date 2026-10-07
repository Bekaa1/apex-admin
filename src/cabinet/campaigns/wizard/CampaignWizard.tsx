import { useEffect, useId, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Alert, Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { CABINET_LINKS } from '../../sections';
import { activeSteps } from './steps';
import { StepBudget } from './steps/StepBudget';
import { StepMedia } from './steps/StepMedia';
import { StepReview } from './steps/StepReview';
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
import type { WizardMode } from './types';

/** Above the steps of an edit: why the moderator returned the campaign, or that saving sends it to moderation. */
function EditNotice({ mode }: { mode: WizardMode }) {
  const { t } = useI18n();
  if (mode.kind !== 'edit') return null;
  if (mode.campaign.rejected) return <ReturnedAlert moderation={mode.moderation} />;
  return (
    <Alert tone={mode.campaign.running ? 'warning' : 'info'} title={t('campaigns.edit.notice.title')}>
      {t(mode.campaign.running ? 'campaigns.edit.notice.running' : 'campaigns.edit.notice.text')}
    </Alert>
  );
}

export function CampaignWizard(options: WizardOptions) {
  const { t } = useI18n();
  const { catalog, mode } = options;
  const wizard = useCampaignWizard(options);
  const { step, form, flow } = wizard;
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorsRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);
  const [params, setParams] = useSearchParams();
  const steps = activeSteps(flow, form.tariff);
  const hasErrors = Object.keys(wizard.errors).length > 0;
  const backTo = mode.kind === 'edit' ? CABINET_LINKS.campaign(mode.campaign.id) : CABINET_LINKS.campaigns;

  // The form came from ?copy=; without it a reload keeps the edits saved in this tab instead of copying again.
  const copied = params.has('copy');
  useEffect(() => {
    if (!copied) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('copy');
        return next;
      },
      { replace: true },
    );
  }, [copied, setParams]);

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
      <Link className="cab-link cmp-back" to={backTo}>
        <Icon name="arrow-left" size={18} />
        {t(mode.kind === 'edit' ? 'campaigns.topUp.back' : 'campaigns.wizard.back')}
      </Link>
      <div className="cab-card cmp-wizard__stepper">
        <WizardStepper flow={flow} step={step} form={form} catalog={catalog} original={wizard.original} onStepClick={wizard.goTo} />
      </div>
      <EditNotice mode={mode} />
      <div className="cmp-wizard__grid">
        <form
          className="cmp-wizard__main"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 'budget' || step === 'review') wizard.submit();
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
            {step === 'review' && mode.kind === 'edit' ? <StepReview wizard={wizard} catalog={catalog} campaign={mode.campaign} /> : null}
          </section>
          {wizard.submitError ? <SubmitError code={wizard.submitError} /> : null}
          <WizardActions flow={flow} step={step} form={form} submitting={wizard.submitting} onBack={wizard.back} cancel={mode.kind === 'edit' ? { to: backTo, onClick: wizard.discard } : null} />
        </form>
        <aside className="cmp-wizard__aside">
          <WizardSummary step={step} form={form} catalog={catalog} edited={mode.kind === 'edit' ? mode.campaign : null} />
          <WizardHelp step={step} failedRules={mode.kind === 'edit' ? (mode.moderation?.rules ?? []) : []} />
        </aside>
      </div>
    </div>
  );
}
