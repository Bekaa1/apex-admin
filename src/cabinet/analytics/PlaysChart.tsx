import { useState } from 'react';
import { Disclosure, Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatCompactNumber, formatNumber } from '../../lib/format';
import { formatDay } from './model';
import type { DailyPlays } from './types';
import styles from './Analytics.module.css';

export function PlaysChart({ days }: { days: DailyPlays[] | null }) {
  const { t, lang } = useI18n();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  if (!days?.length) {
    return <div className={styles.empty}><Icon name="chart" size={30} /><h3>{t('analytics.chart.empty')}</h3><p>{t('analytics.chart.emptyHint')}</p></div>;
  }
  const maximum = Math.max(1, ...days.map((day) => day.plays));
  const active = days.find((day) => day.date === selectedDate) ?? days[days.length - 1];
  return (
    <div className={styles.chart}>
      <div className={styles.chartReadout} aria-live="polite">
        <span>{formatDay(active.date, lang)}</span>
        <strong>{formatCompactNumber(active.plays, lang)} <span>{t('analytics.chart.plays')}</span></strong>
      </div>
      <div className={styles.chartScroll}>
        <div className={styles.plot} style={{ minWidth: days.length > 7 ? 440 : undefined }}>
          <div className={styles.gridLines} aria-hidden="true">
            <span>{formatCompactNumber(maximum, lang)}</span>
            <span>{formatCompactNumber(Math.round(maximum / 2), lang)}</span>
            <span>0</span>
          </div>
          <div className={styles.bars} role="group" aria-label={t('analytics.chart.selectDay')}>
            {days.map((day) => (
              <button
                key={day.date}
                type="button"
                className={styles.barButton}
                aria-pressed={day.date === active.date}
                aria-label={t('analytics.chart.dayValue', { date: formatDay(day.date, lang), count: formatNumber(day.plays, lang) })}
                title={formatDay(day.date, lang) + ': ' + formatNumber(day.plays, lang)}
                onClick={() => setSelectedDate(day.date)}
              >
                <span style={{ height: day.plays ? Math.max(2, day.plays / maximum * 100) + '%' : 2 }} />
              </button>
            ))}
          </div>
          <div className={styles.chartDates} aria-hidden="true">
            <span>{formatDay(days[0].date, lang)}</span>
            {days.length > 1 ? <span>{formatDay(days[days.length - 1].date, lang)}</span> : null}
          </div>
        </div>
      </div>
      <p className={styles.muted}>{t('analytics.chart.hint')}</p>
      <Disclosure summary={t('analytics.chart.table')}>
        <table className={styles.dailyTable}>
          <caption className={styles.srOnly}>{t('analytics.chart.title')}</caption>
          <thead><tr><th scope="col">{t('analytics.chart.date')}</th><th scope="col">{t('analytics.metrics.plays')}</th></tr></thead>
          <tbody>{days.map((day) => <tr key={day.date}><th scope="row">{formatDay(day.date, lang)}</th><td>{formatCompactNumber(day.plays, lang)}</td></tr>)}</tbody>
        </table>
      </Disclosure>
    </div>
  );
}
