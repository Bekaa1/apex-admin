import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { bucketCaption } from '../charts';
import type { StatsChart } from './types';

/** The chart's columns as rows, for reading the exact numbers. */
export function PlaysTable({ chart }: { chart: StatsChart }) {
  const { t, lang } = useI18n();
  return (
    <div className="cab-table-wrap st-chart-table">
      <table className="cab-table">
        <thead>
          <tr>
            <th scope="col">{t(`stats.chart.table.${chart.step}`)}</th>
            <th scope="col" className="cab-table__num">
              {t('stats.chart.table.plays')}
            </th>
          </tr>
        </thead>
        <tbody>
          {chart.buckets.map((bucket) => (
            <tr key={bucket.from}>
              <td className="cab-table__main">
                {bucketCaption(bucket, chart.step, lang)}
                {bucket.partial ? <span className="cab-small"> · {t('stats.chart.table.partial')}</span> : null}
              </td>
              <td className="cab-table__num" data-label={t('stats.chart.table.plays')}>
                {formatNumber(bucket.plays, lang)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
