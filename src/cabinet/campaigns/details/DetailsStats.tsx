import { useId } from 'react';
import { Link } from 'react-router';
import { ColumnsChart, Delta, Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatDayMonth, formatDelta, formatMoney, formatNumber, formatPrice, pluralKey } from '../../../lib/format';
import { deltaTone, playsChartBars } from '../../charts';
import { CABINET_LINKS } from '../../sections';
import type { CampaignDetails } from './types';

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
        bars={playsChartBars(stats.buckets, stats.buckets[0]?.from === stats.buckets[0]?.to ? 'day' : 'week', lang, unit)}
        label={t('campaigns.details.stats.chartLabel')}
        formatValue={(value) => formatNumber(value, lang)}
        keyboardHint={t('campaigns.details.stats.chartHint')}
        plotHeight={150}
      />
      {stage.kind === 'paused' && stage.pausedAt ? (
        <p className="cab-note">
          <Icon name="pause" size={18} />
          {t('campaigns.details.stats.holdNote', { date: formatDayMonth(stage.pausedAt, lang) })}
        </p>
      ) : null}
      {stage.kind === 'changesReview' && stage.since ? (
        <p className="cab-note">
          <Icon name="pause" size={18} />
          {t('campaigns.details.stats.pausedNote', { date: formatDayMonth(stage.since, lang) })}
        </p>
      ) : null}
    </section>
  );
}
