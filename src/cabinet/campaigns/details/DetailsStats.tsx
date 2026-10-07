import { useId } from 'react';
import { Link } from 'react-router';
import { ColumnsChart, Delta, Icon, type ColumnsChartBar, type DeltaTone } from '../../../design-system';
import { useI18n, type Lang } from '../../../i18n/i18n';
import { formatDayMonth, formatDelta, formatMoney, formatNumber, formatPrice, pluralKey } from '../../../lib/format';
import { CABINET_LINKS } from '../../sections';
import type { CampaignDetails, ChartBucket } from './types';

/** Every 4th column gets a label, every 8th keeps it on narrow charts; a label names the month when it changes. */
function chartBars(buckets: ChartBucket[], lang: Lang, unit: (n: number) => string): ColumnsChartBar[] {
  let labelledMonth = '';
  return buckets.map((bucket, index) => {
    const month = bucket.from.slice(0, 7);
    const tick = index % 8 === 0 ? 'major' : index % 4 === 0 ? 'minor' : undefined;
    const withMonth = tick !== undefined && month !== labelledMonth;
    if (withMonth) labelledMonth = month;
    const day = `${bucket.from}T12:00:00+05:00`;
    return {
      key: bucket.from,
      value: bucket.plays,
      label: withMonth ? formatDayMonth(day, lang) : String(Number(bucket.from.slice(8))),
      tick,
      tip: {
        value: formatNumber(bucket.plays, lang),
        unit: unit(bucket.plays),
        caption:
          bucket.from === bucket.to ? formatDayMonth(day, lang) : `${formatDayMonth(day, lang)} — ${formatDayMonth(`${bucket.to}T12:00:00+05:00`, lang)}`,
      },
    };
  });
}

// The tone follows the rounded percent, so «0 %» never looks like a drop.
function deltaTone(delta: number): DeltaTone {
  const pct = Math.round(delta * 100);
  if (pct > 0) return 'success';
  return pct < 0 ? 'danger' : 'neutral';
}

export function DetailsStats({ details }: { details: CampaignDetails }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const { stats, stage } = details;

  if (!stats) {
    return (
      <section className="cab-card cmpd-card cmpd-card--stats cmpd-stats-empty" aria-labelledby={titleId}>
        <span className="cab-tile cab-tile--brand cab-tile--md" aria-hidden="true">
          <Icon name="chart" size={24} />
        </span>
        <div>
          <h2 className="cab-h3" id={titleId}>
            {t('campaigns.details.stats.emptyTitle')}
          </h2>
          <p className="cab-small">{t('campaigns.details.stats.emptyText')}</p>
        </div>
      </section>
    );
  }

  const unit = (n: number) => t(pluralKey('campaigns.details.stats.playsUnit', n, lang));
  return (
    <section className="cab-card cmpd-card cmpd-card--stats" aria-labelledby={titleId}>
      <div className="cmpd-card__head">
        <h2 className="cab-h3" id={titleId}>
          {t(stats.finished ? 'campaigns.details.stats.finishedTitle' : 'campaigns.details.stats.title')}
        </h2>
        <Link className="cab-link cmpd-card__link" to={CABINET_LINKS.campaignStats(details.id)}>
          {t('campaigns.details.stats.all')}
          <Icon name="arrow-right" size={18} />
        </Link>
      </div>
      <dl className="cmpd-nums">
        <div>
          <dt>{t('campaigns.details.stats.plays')}</dt>
          <dd>
            <strong>{formatNumber(stats.plays, lang)}</strong>
            {stats.delta !== null ? (
              <Delta tone={deltaTone(stats.delta)} context={t('campaigns.details.stats.deltaContext')}>
                {formatDelta(stats.delta, lang)}
              </Delta>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>{t('campaigns.details.stats.spent')}</dt>
          <dd>
            <strong>{formatMoney(stats.spent, lang)}</strong>
          </dd>
        </div>
        <div>
          <dt>{t('campaigns.details.stats.price')}</dt>
          <dd>
            <strong>{stats.pricePerPlay === null ? '—' : formatPrice(stats.pricePerPlay, lang)}</strong>
          </dd>
        </div>
        <div>
          <dt>{t('campaigns.details.stats.carts')}</dt>
          <dd>
            <strong>{stats.carts === null ? '—' : formatNumber(stats.carts, lang)}</strong>
          </dd>
        </div>
      </dl>
      <ColumnsChart
        bars={chartBars(stats.buckets, lang, unit)}
        label={t('campaigns.details.stats.chartLabel')}
        formatValue={(value) => formatNumber(value, lang)}
        keyboardHint={t('campaigns.details.stats.chartHint')}
        plotHeight={150}
      />
      {stage.kind === 'changesReview' && stage.since ? (
        <p className="cab-note">
          <Icon name="pause" size={18} />
          {t('campaigns.details.stats.pausedNote', { date: formatDayMonth(stage.since, lang) })}
        </p>
      ) : null}
    </section>
  );
}
