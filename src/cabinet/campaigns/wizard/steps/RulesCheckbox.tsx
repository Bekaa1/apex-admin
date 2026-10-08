import { Checkbox } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { ADVERTISING_RULES_PDF } from '../../../../legal/documents';
import type { CampaignWizardState } from '../useCampaignWizard';

/** «Ролик соответствует правилам размещения рекламы»; the rules open as a PDF in a new tab, where they can be saved. */
export function RulesCheckbox({ wizard }: { wizard: CampaignWizardState }) {
  const { t, tRich } = useI18n();
  const { form, errors, dispatch } = wizard;
  return (
    <Checkbox
      checked={form.rulesAccepted}
      error={errors.rules ? t('campaigns.wizard.budget.rulesError') : undefined}
      onChange={(event) => dispatch({ type: 'rules', value: event.target.checked })}
    >
      {tRich('campaigns.wizard.budget.rules', {
        rules: (chunk) => (
          <a href={ADVERTISING_RULES_PDF} target="_blank" rel="noopener noreferrer" title={t('campaigns.wizard.budget.rulesPdf')}>
            {chunk}
          </a>
        ),
      })}
    </Checkbox>
  );
}
