import { TextField } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../../lib/format';
import { termsOf } from '../../../tariffs';
import { aboutPlays } from '../../playsText';
import { budgetDays } from '../summary';
import type { CampaignWizardState } from '../useCampaignWizard';
import { dailyLimitError } from '../validation';

/** «Лимит показов в день» under the budget, and what the budget buys and for how many days with that limit. */
export function DailyLimit({ wizard }: { wizard: CampaignWizardState }) {
  const { t, lang } = useI18n();
  const { form, dispatch, ctx } = wizard;
  const plan = termsOf(ctx.catalog.tariffs, form.tariff);
  const days = budgetDays(form, ctx);
  // A format check: shown while typing, not only after «Отправить».
  const problem = dailyLimitError(form, ctx.catalog);

  let daysText: string | null = null;
  if (days !== null) daysText = t('campaigns.wizard.dailyLimit.about', { days: t(pluralKey('campaigns.details.budget.days', days, lang), { count: formatNumber(days, lang) }) });
  else if (!problem) daysText = t('campaigns.wizard.dailyLimit.noLimit');

  let error: string | undefined;
  if (problem === 'integer') error = t('campaigns.wizard.dailyLimit.errorInteger');
  if (problem === 'max' && plan?.maxDailyPlays) {
    error = t('campaigns.wizard.dailyLimit.errorMax', { tariff: t(`cabinet.tariffs.${plan.code}.name`), max: formatNumber(plan.maxDailyPlays, lang) });
  }

  return (
    <>
      <TextField
        className="cmp-limit-field"
        label={t('campaigns.wizard.dailyLimit.label')}
        optional={t('campaigns.wizard.media.optional')}
        hint={t('campaigns.wizard.dailyLimit.hint')}
        error={error}
        inputMode="numeric"
        autoComplete="off"
        value={form.dailyLimit}
        onChange={(event) => dispatch({ type: 'dailyLimit', value: event.target.value })}
      />
      {plan && form.budget ? (
        <div className="cmp-forecast">
          <dl className="cab-receipt">
            <div>
              <dt>{t('campaigns.wizard.dailyLimit.plays')}</dt>
              <dd>{aboutPlays(t, lang, form.budget, plan.pricePerPlay)}</dd>
            </div>
            {daysText ? (
              <div>
                <dt>{t('campaigns.wizard.dailyLimit.days')}</dt>
                <dd>{daysText}</dd>
              </div>
            ) : null}
          </dl>
          {daysText ? <p className="cab-note">{t(days === null ? 'campaigns.wizard.dailyLimit.noteNoLimit' : 'campaigns.wizard.dailyLimit.note')}</p> : null}
        </div>
      ) : null}
    </>
  );
}
