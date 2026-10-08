import { useId } from 'react';
import { Badge, Meter, type MeterTone } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatDayMonth, formatMoney, formatNumber, formatPercent, pluralKey } from '../../lib/format';
import { STAGE_BADGE } from '../campaignStage';
import { CABINET_LINKS } from '../sections';
import { ButtonLink } from '../ui/ButtonLink';
import { CampaignCover } from '../ui/CampaignCover';
import type { CampaignHead } from './types';

/** One campaign above its statistics: status, plan, stores and carts, dates, and what is left of the budget. */
export function CampaignHeadCard({ head }: { head: CampaignHead }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const { stage, budget } = head;
  const badge = STAGE_BADGE[stage.kind];
  const finished = stage.kind === 'finished';
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  let dates: string | null = null;
  if (stage.kind === 'finished' && stage.from && stage.to) dates = t('stats.head.period', { from: formatDayMonth(stage.from, lang), to: formatDayMonth(stage.to, lang) });
  else if ((stage.kind === 'active' || stage.kind === 'paused') && stage.since) dates = t('stats.head.since', { date: formatDayMonth(stage.since, lang) });
  const meta = [head.tariff ? t(`cabinet.tariffs.${head.tariff}.name`) : null, head.stores ? count('stats.head.stores', head.stores) : null, head.carts ? count('stats.head.carts', head.carts) : null, dates];
  const meterTone: MeterTone = budget.ended ? 'danger' : budget.low ? 'warning' : 'primary';
  const total = formatMoney(budget.budget, lang);
  return (
    <section className="cab-card st-head" aria-labelledby={titleId}>
      <CampaignCover url={head.coverUrl} videoUrl={head.videoUrl} tone={head.coverTone} size="lg" />
      <div className="st-head__main">
        <div className="st-head__title">
          <h2 className="cab-h2" id={titleId}>
            {head.name}
          </h2>
          <Badge tone={badge.tone} dot>
            {t(badge.labelKey)}
          </Badge>
        </div>
        <p className="cmp-row__meta">
          {meta.flatMap((item) => (item ? [<span key={item}>{item}</span>] : []))}
        </p>
      </div>
      {budget.budget > 0 ? (
        <div className="st-head__budget">
          <div className="cab-cell-budget">
            <span className="st-head__budget-label">{t('stats.head.budget')}</span>
            <Meter value={budget.spentPct} tone={meterTone} size="sm" label={t('stats.head.meterLabel', { pct: formatPercent(budget.spentPct / 100, lang) })} />
            <span className={budget.ended ? 'is-danger' : budget.low ? 'is-warning' : undefined}>
              {finished ? t('stats.head.spentOf', { spent: formatMoney(budget.spent, lang), total }) : t('stats.head.left', { left: formatMoney(budget.left, lang), total })}
            </span>
          </div>
          {head.canTopUp ? (
            <ButtonLink to={CABINET_LINKS.campaignTopUp(head.id)} variant="secondary" size="md" iconLeft="wallet">
              {t('stats.head.topUp')}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
