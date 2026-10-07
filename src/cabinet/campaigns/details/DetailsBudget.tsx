import { useId } from 'react';
import { Meter } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatNumber, pluralKey } from '../../../lib/format';
import { CABINET_LINKS } from '../../sections';
import { ButtonLink } from '../../ui/ButtonLink';
import type { CampaignDetails } from './types';

export function DetailsBudget({ details }: { details: CampaignDetails }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const { budget, stage } = details;
  const total = formatMoney(budget.budget, lang);
  const launched = details.startDate !== null;
  const finished = stage.kind === 'finished';
  const tone = budget.ended ? 'danger' : budget.low ? 'warning' : undefined;
  const showTopUp = details.canTopUp && (stage.kind === 'active' || stage.kind === 'noBudget');

  let big = (
    <p className="cmpd-budget__big">
      <strong>{total}</strong>
      {budget.paid === true ? <span className="cmp-ok">{t('campaigns.row.paid')}</span> : null}
      {budget.paid === false ? <span>{t('campaigns.row.notPaid')}</span> : null}
    </p>
  );
  if (launched) {
    big = (
      <p className="cmpd-budget__big">
        <strong className={tone ? `is-${tone}` : undefined}>{formatMoney(finished ? budget.spent : budget.left, lang)}</strong>
        <span>{t(finished ? 'campaigns.details.budget.spentOf' : 'campaigns.details.budget.leftOf', { total })}</span>
      </p>
    );
  }

  return (
    <section className="cab-card cmpd-card cmpd-card--budget" aria-labelledby={titleId}>
      <h2 className="cab-h3" id={titleId}>
        {t('campaigns.details.budget.title')}
      </h2>
      {big}
      {launched ? (
        <Meter
          value={budget.ended ? 100 : budget.spentPct}
          tone={tone ?? 'primary'}
          size="md"
          label={t('campaigns.row.spentPct', { pct: Math.round(budget.ended ? 100 : budget.spentPct) })}
        />
      ) : null}
      <dl className="cab-receipt cmpd-budget__facts">
        {launched && !finished ? (
          <div>
            <dt>{t('campaigns.details.budget.spent')}</dt>
            <dd>{formatMoney(budget.spent, lang)}</dd>
          </div>
        ) : null}
        {budget.minTopUp !== null ? (
          <div>
            <dt>{t('campaigns.details.budget.minTopUp')}</dt>
            <dd>{formatMoney(budget.minTopUp, lang)}</dd>
          </div>
        ) : null}
        {budget.daysLeft !== null ? (
          <div>
            <dt>{t('campaigns.details.budget.enoughFor')}</dt>
            <dd>{t(pluralKey('campaigns.details.budget.days', budget.daysLeft, lang), { count: formatNumber(budget.daysLeft, lang) })}</dd>
          </div>
        ) : null}
      </dl>
      {showTopUp ? (
        <>
          <ButtonLink to={CABINET_LINKS.campaignTopUp(details.id)} variant="secondary" size="md" fullWidth iconLeft="wallet">
            {t('campaigns.row.actions.topUp')}
          </ButtonLink>
          <p className="cab-small">{t('campaigns.details.budget.topUpNote')}</p>
        </>
      ) : null}
    </section>
  );
}
