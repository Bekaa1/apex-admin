import { useId } from 'react';
import { Button, Icon, type IconName } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { SUPPORT_WHATSAPP_URL } from '../../../lib/contacts';
import { MODERATION_RULES } from '../rules';
import type { StepId } from './types';

const HELP: Record<StepId, { icon: IconName; tone: 'success' | 'brand' }> = {
  media: { icon: 'shield-check', tone: 'success' },
  tariff: { icon: 'layers', tone: 'brand' },
  stores: { icon: 'store', tone: 'brand' },
  zones: { icon: 'shelf', tone: 'brand' },
  budget: { icon: 'message-circle', tone: 'brand' },
};

/** The help card under the summary: moderation rules on step 1, tips on the next steps, the manager on the last one. */
export function WizardHelp({ step, failedRules }: { step: StepId; failedRules: string[] }) {
  const { t } = useI18n();
  const titleId = useId();
  const help = HELP[step];
  return (
    <section className="cab-card cmp-aside-card" aria-labelledby={titleId}>
      <div className="cmp-aside-card__head">
        <span className={`cab-tile cab-tile--${help.tone} cab-tile--sm`} aria-hidden="true">
          <Icon name={help.icon} size={20} />
        </span>
        <h3 className="cmp-aside-card__title" id={titleId}>
          {t(`campaigns.wizard.help.${step}.title`)}
        </h3>
      </div>
      <p className="cab-small">{t(`campaigns.wizard.help.${step}.text`)}</p>
      {step === 'media' ? (
        <ul className="cmp-rules">
          {MODERATION_RULES.map((rule) => {
            const failed = failedRules.includes(rule);
            return (
              <li key={rule} className={failed ? 'is-failed' : undefined}>
                <Icon name={failed ? 'alert-circle' : 'check'} size={18} />
                <span>
                  {failed ? <span className="cab-sr">{t('campaigns.wizard.help.media.failed')}</span> : null}
                  {t(`campaigns.rules.${rule}`)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {step === 'budget' ? (
        <Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="secondary" size="md" iconLeft="message-circle">
          {t('campaigns.wizard.help.budget.whatsapp')}
        </Button>
      ) : null}
    </section>
  );
}
