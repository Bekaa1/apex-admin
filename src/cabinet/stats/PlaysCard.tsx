import { useId, useState } from 'react';
import { ColumnsChart, Icon, IconButton, SegmentedControl } from '../../design-system';
import { useI18n, type Lang } from '../../i18n/i18n';
import { isoWeekday } from '../../lib/dates';
import { formatDayMonth, formatDayRange, formatMonthYear, formatNumber, pluralKey } from '../../lib/format';
import { playsChartBars, type ChartStep } from '../charts';
import { CHART_STEPS } from './filters';
import { PlaysTable } from './PlaysTable';
import type { StatsChart } from './types';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** «В среднем 3 064 в день · пик — 19 сент., сб: 4 407». */
function chartCaption({ step, average, peak }: StatsChart, t: Translate, lang: Lang): string {
  const parts: string[] = [];
  if (average !== null) parts.push(t(`stats.chart.average.${step}`, { value: formatNumber(Math.round(average), lang) }));
  if (peak) {
    parts.push(
      t(`stats.chart.peak.${step}`, {
        date: formatDayMonth(peak.from, lang),
        weekday: t(`stats.hours.weekdays.${isoWeekday(peak.from)}`),
        range: formatDayRange(peak.from, peak.to, lang),
        month: formatMonthYear(peak.from, lang),
        value: formatNumber(peak.plays, lang),
      }),
    );
  }
  return parts.join(' · ');
}

/** Plays by day, week or month; partial weeks and months are hatched. Can show the same numbers as a table. */
export function PlaysCard({ chart, single, onStep }: { chart: StatsChart; single: boolean; onStep: (step: ChartStep) => void }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const [asTable, setAsTable] = useState(false);
  const unit = (plays: number) => t(pluralKey('stats.chart.playsUnit', plays, lang));
  return (
    <section className="cab-card st-card" aria-labelledby={titleId}>
      <div className="st-card__head">
        <div className="st-card__copy">
          <h2 className="cab-h3" id={titleId}>
            {t(single ? 'stats.chart.titleCampaign' : 'stats.chart.title')}
          </h2>
          <p className="cab-small">{chartCaption(chart, t, lang)}</p>
        </div>
        <div className="st-card__tools">
          <SegmentedControl
            label={t('stats.chart.step')}
            options={CHART_STEPS.map((value) => ({ value, label: t(`stats.chart.steps.${value}`) }))}
            value={chart.step}
            onChange={onStep}
          />
          <IconButton icon="table" label={t('stats.chart.showTable')} aria-pressed={asTable} onClick={() => setAsTable((shown) => !shown)} />
        </div>
      </div>
      {asTable ? (
        <PlaysTable chart={chart} />
      ) : (
        <ColumnsChart
          bars={playsChartBars(chart.buckets, chart.step, lang, unit)}
          label={t(`stats.chart.label.${chart.step}`)}
          formatValue={(value) => formatNumber(value, lang)}
          keyboardHint={t('stats.chart.hint')}
        />
      )}
      {chart.hasPartial && chart.step !== 'day' ? (
        <p className="cab-note">
          <Icon name="info" size={18} />
          {t(`stats.chart.partial.${chart.step}`)}
        </p>
      ) : null}
    </section>
  );
}
