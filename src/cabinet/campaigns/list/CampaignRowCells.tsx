import { Meter } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatCompactNumber, formatMoney } from '../../../lib/format';
import { ButtonLink } from '../../ui/ButtonLink';
import type { CampaignCard, PlaysPeriod } from '../types';
import { rowAction } from './rowView';

/** Not launched yet: the budget and whether it is paid. Launched: how much is spent. */
export function BudgetCell({ card }: { card: CampaignCard }) {
  const { t, lang } = useI18n();
  const { budget, stage } = card;
  const total = formatMoney(budget.budget, lang);

  if (stage.kind === 'review' || stage.kind === 'awaitingPayment' || stage.kind === 'rejected') {
    if (budget.budget === 0) {
      return (
        <div className="cmp-row__budget">
          <span className="cmp-row__muted">{t('campaigns.row.budgetNotSet')}</span>
        </div>
      );
    }
    const paid = stage.kind === 'awaitingPayment' ? false : stage.paid;
    return (
      <div className="cmp-row__budget">
        <div className="cab-cell-budget">
          <strong className="cmp-row__money">{total}</strong>
          {paid === true ? <span className="cmp-ok">{t('campaigns.row.paid')}</span> : null}
          {paid === false ? <span className={stage.kind === 'awaitingPayment' ? 'is-warning' : undefined}>{t('campaigns.row.notPaid')}</span> : null}
        </div>
      </div>
    );
  }

  const ended = stage.kind === 'noBudget';
  const pct = ended ? 100 : budget.spentPct;
  let text = t('campaigns.row.left', { left: formatMoney(budget.left, lang), total });
  if (ended) text = t('campaigns.row.ended');
  else if (stage.kind === 'finished') text = t('campaigns.row.spentOf', { spent: formatMoney(budget.spent, lang), total });
  return (
    <div className="cmp-row__budget">
      <div className="cab-cell-budget">
        <Meter
          value={pct}
          tone={ended ? 'danger' : budget.low ? 'warning' : 'primary'}
          size="sm"
          label={t('campaigns.row.spentPct', { pct: Math.round(pct) })}
        />
        <span className={ended ? 'is-danger' : budget.low ? 'is-warning' : undefined}>{text}</span>
      </div>
    </div>
  );
}

export function PlaysCell({ plays, period }: { plays: CampaignCard['plays']; period: PlaysPeriod }) {
  const { t, lang } = useI18n();
  if (!plays) {
    return (
      <div className="cmp-row__shows is-empty">
        <span className="cmp-row__shows-num cab-subtle" aria-hidden="true">
          —
        </span>
        <span className="cmp-row__shows-label">{t('campaigns.row.notStarted')}</span>
      </div>
    );
  }
  return (
    <div className="cmp-row__shows">
      <span className="cmp-row__shows-num">{formatCompactNumber(plays[period], lang)}</span>
      <span className="cmp-row__shows-label">{t(`campaigns.row.playsLabel.${period}`)}</span>
    </div>
  );
}

export function ActionCell({ card }: { card: CampaignCard }) {
  const { t } = useI18n();
  const action = rowAction(card);
  return (
    <div className="cmp-row__action">
      <ButtonLink to={action.to} variant={action.variant} size="md" iconLeft={action.iconLeft} iconRight={action.iconRight}>
        {t(action.labelKey)}
      </ButtonLink>
    </div>
  );
}
