import { Alert, Badge, Button, Skeleton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { periodRange } from './model';
import type { Period } from './types';
import styles from './Analytics.module.css';

export function PeriodPicker({ value, today, from, to, onChange, onRangeChange }: {
  value: Period;
  today: string;
  from: string;
  to: string;
  onChange: (period: Period) => void;
  onRangeChange: (which: 'from' | 'to', date: string) => void;
}) {
  const { t, lang } = useI18n();
  return (
    <div className={styles.periodPicker}>
      <label className={styles.periodSelect}>
        <span>{t('analytics.period.label')}</span>
        <select value={value} onChange={(event) => onChange(event.currentTarget.value as Period)}>
          {(['today', '7d', '30d', 'custom'] as const).map((period) => <option key={period} value={period}>{t('analytics.period.' + period)}</option>)}
        </select>
      </label>
      {value === 'custom' ? (
        <div className={styles.dateRange}>
          <label className={styles.dateField}><span>{t('analytics.period.from')}</span><input type="date" value={from} max={today} onChange={(event) => onRangeChange('from', event.currentTarget.value)} /></label>
          <label className={styles.dateField}><span>{t('analytics.period.to')}</span><input type="date" value={to} min={from} max={today} onChange={(event) => onRangeChange('to', event.currentTarget.value)} /></label>
        </div>
      ) : <span>{periodRange(value, today, lang, from, to)} · UTC</span>}
    </div>
  );
}

export function StoreStatus({ online, carts }: { online: number | null; carts: number | null }) {
  const { t } = useI18n();
  const status = carts === 0 ? 'noCarts' : online === null ? 'unknown' : online === 0 ? 'offline' : 'online';
  return <Badge tone={status === 'online' ? 'success' : 'neutral'} dot>{t('analytics.status.' + status)}</Badge>;
}

export function AnalyticsLoading() {
  const { t } = useI18n();
  return (
    <div className={styles.page} aria-busy="true" aria-label={t('analytics.loading')}>
      <p role="status" className={styles.muted}>{t('analytics.loading')}</p>
      <Skeleton width="65%" height={32} />
      <div className={styles.kpis}>{[0, 1, 2, 3].map((tile) => <div key={tile} className={styles.panel}><Skeleton width="75%" /><Skeleton width="50%" height={32} /></div>)}</div>
      <div className={styles.panel}>{[0, 1, 2].map((row) => <div className={styles.loadingRow} key={row}><Skeleton width="45%" /><Skeleton width="80%" height={24} /></div>)}</div>
    </div>
  );
}

export function AnalyticsError({ onRetry, refreshing = false, stale = false }: { onRetry: () => void; refreshing?: boolean; stale?: boolean }) {
  const { t } = useI18n();
  return <Alert tone={stale ? 'warning' : 'danger'} title={t(stale ? 'analytics.error.staleTitle' : 'analytics.error.title')} action={<Button variant="secondary" size="md" loading={refreshing} onClick={onRetry}>{t('analytics.error.retry')}</Button>}>{t(stale ? 'analytics.error.staleText' : 'analytics.error.text')}</Alert>;
}
