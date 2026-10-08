import { Icon, SegmentedControl, Select } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatDayRange, formatTime } from '../../lib/format';
import { STATS_SCOPES } from './filters';
import { STATS_PERIODS } from './period';
import type { StatsFilters, StatsMeta, StatsOption, StatsPeriod } from './types';

interface StatsFilterBarProps {
  filters: StatsFilters;
  options: StatsOption[];
  /** One campaign is shown: there is no «which campaigns» switch. */
  single: boolean;
  /** The counted period, the default one when none is chosen. */
  period: StatsPeriod;
  meta: StatsMeta | null;
  onChange: (patch: Partial<StatsFilters>) => void;
}

/** Campaign, period and which campaigns to count; under them the dates and when the data came. */
export function StatsFilterBar({ filters, options, single, period, meta, onChange }: StatsFilterBarProps) {
  const { t, lang } = useI18n();
  return (
    <div className="st-filters">
      <div className="st-filters__row">
        <Select
          className="st-filters__campaign"
          label={t('stats.filters.campaign')}
          hideLabel
          size="md"
          icon="megaphone"
          options={[{ value: '', label: t('stats.filters.allCampaigns') }, ...options.map((option) => ({ value: option.id, label: option.name }))]}
          value={single && filters.campaignId ? filters.campaignId : ''}
          onValueChange={(id) => onChange({ campaignId: id || null, step: null })}
        />
        <Select
          className="st-filters__period"
          label={t('stats.filters.period')}
          hideLabel
          size="md"
          icon="calendar"
          options={STATS_PERIODS.map((value) => ({ value, label: t(`stats.filters.periods.${value}`) }))}
          value={period}
          onValueChange={(next) => onChange({ period: next, step: null })}
        />
        {single ? null : (
          <SegmentedControl
            className="st-filters__scope"
            label={t('stats.filters.scope')}
            options={STATS_SCOPES.map((value) => ({ value, label: t(`stats.filters.scopes.${value}`) }))}
            value={filters.scope}
            onChange={(scope) => onChange({ scope })}
          />
        )}
      </div>
      {meta ? (
        <p className="st-filters__meta">
          <span>
            <Icon name="calendar" size={16} />
            {formatDayRange(meta.range.from, meta.range.to, lang)}
          </span>
          {meta.compare ? (
            <span>{meta.noComparison ? t('stats.meta.noCompare') : t('stats.meta.compare', { range: formatDayRange(meta.compare.from, meta.compare.to, lang) })}</span>
          ) : null}
          {meta.syncedAt ? <span>{t('stats.meta.updated', { time: formatTime(meta.syncedAt, lang) })}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
