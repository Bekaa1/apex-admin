import { useId, useState } from 'react';
import { Checkbox, Chip, Icon, TextField, Timeline } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatMoney, formatNumber, formatPrice } from '../../../../lib/format';
import { termsOf } from '../../../tariffs';
import { useAccount } from '../../../useAccount';
import { budgetPresets, summarize } from '../summary';
import type { WizardCatalog } from '../types';
import type { CampaignWizardState } from '../useCampaignWizard';
import { WizardTermsChanged } from '../WizardTermsChanged';
import { ReviewList } from './ReviewList';

/** Step 5: budget, review of the campaign, what happens next and the rules consent. */
export function StepBudget({ wizard, catalog }: { wizard: CampaignWizardState; catalog: WizardCatalog }) {
  const { t, lang } = useI18n();
  const { form, errors, dispatch } = wizard;
  const { contact } = useAccount();
  const budgetId = useId();
  const reviewId = useId();
  const afterId = useId();
  const { minimum } = summarize(form, wizard.ctx);
  const plan = termsOf(wizard.ctx.catalog.tariffs, form.tariff);
  // Digits while typing, grouped after leaving the field, so the caret never jumps.
  const [text, setText] = useState(form.budget === null ? '' : formatNumber(form.budget, lang));
  const tariffName = form.tariff ? t(`cabinet.tariffs.${form.tariff}.name`) : '';
  const minimumText = minimum === null ? '' : formatMoney(minimum, lang);

  const setBudget = (value: number | null, display: string) => {
    setText(display);
    dispatch({ type: 'budget', value });
  };

  let budgetError: string | undefined;
  if (errors.budget === 'required') budgetError = t('campaigns.wizard.budget.errorRequired');
  if (errors.budget === 'min') budgetError = t('campaigns.wizard.budget.errorMin', { tariff: tariffName, amount: minimumText });

  return (
    <div className="cmp-fields cmp-fields--loose">
      <WizardTermsChanged wizard={wizard} />
      <section className="cmp-sub" aria-labelledby={budgetId}>
        <h3 className="cmp-sub__title" id={budgetId}>
          {t('campaigns.wizard.budget.section')}
        </h3>
        {minimum !== null ? (
          <p className="cmp-min">
            <Icon name="info" size={18} />
            {t('campaigns.wizard.budget.minimum', { tariff: tariffName, amount: minimumText, price: plan ? formatPrice(plan.pricePerPlay, lang) : '—' })}
          </p>
        ) : null}
        <div className="cmp-budget-row">
          <TextField
            className="cmp-budget-field"
            label={t('campaigns.wizard.budget.label')}
            hint={t('campaigns.wizard.budget.hint')}
            error={budgetError}
            inputMode="numeric"
            autoComplete="off"
            value={text}
            trailing={
              <span className="cmp-currency" aria-hidden="true">
                ₸
              </span>
            }
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '');
              setBudget(digits ? Number(digits) : null, digits);
            }}
            onBlur={() => setText(form.budget === null ? '' : formatNumber(form.budget, lang))}
          />
          {minimum !== null ? (
            <div className="cmp-chips" role="group" aria-label={t('campaigns.wizard.budget.presets')}>
              {budgetPresets(minimum).map((amount) => (
                <Chip key={amount} pressed={form.budget === amount} label={formatMoney(amount, lang)} onClick={() => setBudget(amount, formatNumber(amount, lang))} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
      <section className="cmp-sub" aria-labelledby={reviewId}>
        <h3 className="cmp-sub__title" id={reviewId}>
          {t('campaigns.wizard.budget.review')}
        </h3>
        <ReviewList wizard={wizard} catalog={catalog} />
      </section>
      <section className="cmp-sub" aria-labelledby={afterId}>
        <h3 className="cmp-sub__title" id={afterId}>
          {t('campaigns.wizard.budget.after')}
        </h3>
        <Timeline
          stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
          items={[
            { key: 'review', title: t('campaigns.wizard.budget.timeline.review'), text: t('campaigns.wizard.budget.timeline.reviewText'), state: 'todo' },
            {
              key: 'payment',
              title: t('campaigns.wizard.budget.timeline.payment'),
              text: t('campaigns.wizard.budget.timeline.paymentText', { amount: formatMoney(form.budget ?? minimum ?? 0, lang), email: contact ?? '' }),
              state: 'todo',
            },
            { key: 'launch', title: t('campaigns.wizard.budget.timeline.launch'), text: t('campaigns.wizard.budget.timeline.launchText'), state: 'todo' },
          ]}
        />
      </section>
      <Checkbox
        checked={form.rulesAccepted}
        error={errors.rules ? t('campaigns.wizard.budget.rulesError') : undefined}
        onChange={(event) => dispatch({ type: 'rules', value: event.target.checked })}
      >
        {t('campaigns.wizard.budget.rules')}
      </Checkbox>
    </div>
  );
}
