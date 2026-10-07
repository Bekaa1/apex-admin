import { useId } from 'react';
import { Heatmap } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import type { HeatmapData } from './types';

// Hour columns are labelled every three hours, as drawn.
const LABEL_EVERY = 3;
const hourLabel = (hour: number) => `${hour}:00`;

/** «Когда показывали ролик»: average plays by weekday and hour, and the busiest days and hours in words. */
export function HoursCard({ hours }: { hours: HeatmapData }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const weekday = (day: number) => t(`stats.hours.weekdays.${day}`);
  const busiest = hours.bestHours
    ? { days: hours.bestDays.map(weekday).join(` ${t('stats.hours.and')} `), from: hourLabel(hours.bestHours.from), to: hourLabel(hours.bestHours.to) }
    : null;
  return (
    <section className="cab-card st-card" aria-labelledby={titleId}>
      <div className="st-card__head">
        <div className="st-card__copy">
          <h2 className="cab-h3" id={titleId}>
            {t('stats.hours.title')}
          </h2>
          {busiest ? <p className="cab-small">{t('stats.hours.lead', busiest)}</p> : null}
        </div>
      </div>
      <Heatmap
        label={busiest ? t('stats.hours.label', busiest) : t('stats.hours.labelEmpty')}
        columns={hours.hours.map((hour) => (hour % LABEL_EVERY === 0 ? String(hour) : ''))}
        rows={hours.rows.map((row) => ({
          key: String(row.weekday),
          label: weekday(row.weekday),
          cells: row.cells.map((cell) => ({
            level: cell.level,
            title: t('stats.hours.cell', { weekday: weekday(row.weekday), hour: hourLabel(cell.hour), value: formatNumber(Math.round(cell.average), lang) }),
          })),
        }))}
        legend={{ less: t('stats.hours.less'), more: t('stats.hours.more') }}
      />
    </section>
  );
}
