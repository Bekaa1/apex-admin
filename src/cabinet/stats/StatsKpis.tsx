import { Delta, StatTile, type DeltaTone } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatDelta, formatMoney, formatNumber, formatPercent, formatPrice } from '../../lib/format';
import { deltaTone, deltaTrend } from '../charts';
import type { StatsKpis as Kpis, StatsMeta } from './types';

/** Plays, spend, price of a play and carts for the period, with the change vs the previous one. */
export function StatsKpis({ kpis, meta, single }: { kpis: Kpis; meta: StatsMeta; single: boolean }) {
  const { t, lang } = useI18n();
  const versus = meta.period === 'all' ? undefined : t(`stats.kpi.vs.${meta.period}`);
  const trend = (change: number | null, tone: DeltaTone) =>
    change === null ? undefined : (
      <Delta tone={tone} trend={deltaTrend(change)}>
        {formatDelta(change, lang)}
      </Delta>
    );
  const { carts } = kpis;
  return (
    <section className="cab-kpis" aria-label={t('stats.kpi.label')}>
      <StatTile
        className="st-kpi"
        icon="play"
        label={t('stats.kpi.plays')}
        value={formatNumber(kpis.plays, lang)}
        trend={trend(kpis.playsChange, kpis.playsChange === null ? 'neutral' : deltaTone(kpis.playsChange))}
        meta={kpis.playsChange === null ? undefined : versus}
      />
      <StatTile
        className="st-kpi"
        icon="wallet"
        label={t('stats.kpi.spent')}
        value={formatMoney(kpis.spent, lang)}
        trend={trend(kpis.spentChange, 'neutral')}
        meta={kpis.spentChange === null ? undefined : versus}
      />
      <StatTile
        className="st-kpi"
        icon="tag"
        label={t('stats.kpi.price')}
        value={kpis.price === null ? '—' : formatPrice(kpis.price, lang)}
        trend={trend(kpis.priceChange, kpis.priceChange === null ? 'neutral' : deltaTone(kpis.priceChange, true))}
        meta={kpis.priceChange === null ? t('stats.kpi.priceAverage') : versus}
      />
      {carts?.kind === 'online' ? (
        <StatTile
          className="st-kpi"
          icon="wifi"
          label={t('stats.kpi.cartsOnline')}
          value={
            <>
              {formatNumber(carts.online, lang)}
              <span className="st-kpi__suffix">{t('stats.kpi.cartsOf', { total: formatNumber(carts.total, lang) })}</span>
            </>
          }
          meta={t('stats.kpi.onlineNow', { pct: formatPercent(carts.online / carts.total, lang) })}
        />
      ) : null}
      {carts?.kind === 'total' ? (
        <StatTile
          className="st-kpi"
          icon="cart"
          label={t('stats.kpi.carts')}
          value={formatNumber(carts.total, lang)}
          meta={t(single ? 'stats.kpi.cartsWere' : 'stats.kpi.cartsWereAll')}
        />
      ) : null}
    </section>
  );
}
