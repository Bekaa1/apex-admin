import { useId, useState } from 'react';
import { Alert, Button, Chip, Icon, TextField } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatNumber, pluralKey } from '../../../lib/format';
import { CABINET_LINKS } from '../../sections';
import { ButtonLink } from '../../ui/ButtonLink';
import { daysFor } from '../details/model';
import { budgetPresets } from '../wizard/summary';
import { CampaignStrip } from './CampaignStrip';
import type { TopUpCampaign, TopUpTerms } from './model';
import { TermsChanged } from './TermsChanged';
import type { TopUpState } from './useTopUp';

// Codes that get their own text; anything else reads as a lost connection with «Повторить».
const KNOWN_ERRORS = ['tariff_changed', 'missing_email', 'invalid_status', 'invalid_tariff', 'not_found', 'not_authenticated'];

export function TopUpForm({ campaign, terms, form, email }: { campaign: TopUpCampaign; terms: TopUpTerms; form: TopUpState; email: string }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const amountId = useId();
  const hintId = useId();
  // Digits while typing, grouped after leaving the field, so the caret never jumps.
  const [text, setText] = useState(form.amount === null ? '' : formatNumber(form.amount, lang));
  const tariffName = campaign.tariff ? t(`cabinet.tariffs.${campaign.tariff}.name`) : '';
  const minimum = formatMoney(terms.minimum, lang);
  const after = campaign.money.left + (form.amount ?? 0);
  const days = daysFor(after, campaign.spendPerDay);
  const set = (value: number | null, display: string) => {
    setText(display);
    form.setAmount(value);
  };

  let amountError: string | undefined;
  if (form.amountError === 'required') amountError = t('campaigns.topUp.amount.errorRequired');
  if (form.amountError === 'min') amountError = t('campaigns.topUp.amount.errorMin', { tariff: tariffName, amount: minimum });

  return (
    <>
      <section className="cab-card cmp-step" aria-labelledby={titleId}>
        <header className="cmp-step__head">
          <h2 className="cab-h2" id={titleId}>
            {t('campaigns.topUp.title')}
          </h2>
          <p className="cab-lead">{t('campaigns.topUp.lead')}</p>
        </header>
        <CampaignStrip campaign={campaign} />
        {terms.changed ? <TermsChanged terms={terms} tariffName={tariffName} agreed={form.agreed} onAgree={form.setAgreed} /> : null}
        {form.error ? (
          <Alert
            tone={form.error === 'tariff_changed' ? 'warning' : 'danger'}
            title={t(form.error === 'tariff_changed' ? 'campaigns.topUp.errors.changedTitle' : 'campaigns.topUp.errors.title')}
            action={
              form.error === 'missing_email' ? (
                <ButtonLink to={CABINET_LINKS.profile} variant="secondary" size="md">
                  {t('campaigns.wizard.submitError.toProfile')}
                </ButtonLink>
              ) : KNOWN_ERRORS.includes(form.error) ? undefined : (
                <Button variant="secondary" size="md" iconLeft="refresh" onClick={form.submit}>
                  {t('cabinet.retry')}
                </Button>
              )
            }
          >
            {t(KNOWN_ERRORS.includes(form.error) ? `campaigns.topUp.errors.${form.error}` : 'campaigns.topUp.errors.network')}
          </Alert>
        ) : null}
        <section className="cmp-sub" aria-labelledby={amountId}>
          <h3 className="cmp-sub__title" id={amountId}>
            {t('campaigns.topUp.amount.title')}
          </h3>
          <p className="cmp-min">
            <Icon name="info" size={18} />
            {t('campaigns.topUp.amount.minimum', { tariff: tariffName, amount: minimum })}
          </p>
          <div className="cmp-budget-row">
            <TextField
              className="cmp-budget-field"
              label={t('campaigns.topUp.amount.label')}
              hint={t('campaigns.topUp.amount.hint', { email })}
              error={amountError}
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
                set(digits ? Number(digits) : null, digits);
              }}
              onBlur={() => setText(form.amount === null ? '' : formatNumber(form.amount, lang))}
            />
            <div className="cmp-chips" role="group" aria-label={t('campaigns.wizard.budget.presets')}>
              {budgetPresets(terms.minimum).map((value) => (
                <Chip key={value} pressed={form.amount === value} label={formatMoney(value, lang)} onClick={() => set(value, formatNumber(value, lang))} />
              ))}
            </div>
          </div>
          <dl className="cab-receipt cmpt-terms">
            <div>
              <dt>{t('campaigns.topUp.receipt.tariff')}</dt>
              <dd>{tariffName || '—'}</dd>
            </div>
            <div>
              <dt>{t('campaigns.topUp.receipt.minimum')}</dt>
              <dd>{minimum}</dd>
            </div>
            <div>
              <dt>{t('campaigns.topUp.receipt.after')}</dt>
              <dd>{formatMoney(after, lang)}</dd>
            </div>
            {days !== null ? (
              <div>
                <dt>{t('campaigns.details.budget.enoughFor')}</dt>
                <dd>{t(pluralKey('campaigns.details.budget.days', days, lang), { count: formatNumber(days, lang) })}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </section>
      <div className="cmp-actions">
        <ButtonLink to={CABINET_LINKS.campaign(campaign.id)} variant="ghost" size="lg">
          {t('campaigns.topUp.cancel')}
        </ButtonLink>
        {form.agreed ? null : (
          <span className="cmpt-hint" id={hintId}>
            {t('campaigns.topUp.agreeHint')}
          </span>
        )}
        <Button type="submit" variant="primary" size="lg" iconLeft="receipt" className="cmp-actions__next" loading={form.submitting} disabled={!form.agreed} aria-describedby={form.agreed ? undefined : hintId}>
          {t('campaigns.topUp.submit')}
        </Button>
      </div>
    </>
  );
}
