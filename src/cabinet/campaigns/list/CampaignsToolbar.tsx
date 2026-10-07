import { SearchField, SegmentedControl, Select, Tabs } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber } from '../../../lib/format';
import { PERIODS, SORTS, TABS, type ListFilters } from '../listFilters';
import type { CampaignTab } from '../types';

export interface CampaignsToolbarProps {
  filters: ListFilters;
  /** The search text as typed; the URL copy of it may lag a render behind. */
  query: string;
  counts: Record<CampaignTab, number>;
  panelId: string;
  onQueryChange: (query: string) => void;
  onChange: (patch: Partial<ListFilters>) => void;
}

export function CampaignsToolbar({ filters, query, counts, panelId, onQueryChange, onChange }: CampaignsToolbarProps) {
  const { t, lang } = useI18n();
  return (
    <div className="cmp-toolbar">
      <Tabs
        label={t('campaigns.list.filterLabel')}
        panelId={panelId}
        items={TABS.map((tab) => ({ value: tab, label: t(`campaigns.list.tabs.${tab}`), count: formatNumber(counts[tab], lang) }))}
        value={filters.tab}
        onChange={(tab) => onChange({ tab })}
      />
      <div className="cmp-toolbar__row">
        <SearchField
          className="cmp-toolbar__search"
          size="md"
          label={t('campaigns.list.search')}
          clearLabel={t('campaigns.list.clearSearch')}
          value={query}
          onValueChange={onQueryChange}
        />
        <div className="cmp-toolbar__period">
          <span className="cmp-toolbar__label" aria-hidden="true">
            {t('campaigns.list.periodLabel')}
          </span>
          <SegmentedControl
            label={t('campaigns.list.periodGroup')}
            options={PERIODS.map((period) => ({ value: period, label: t(`campaigns.list.period.${period}`) }))}
            value={filters.period}
            onChange={(period) => onChange({ period })}
          />
        </div>
        <Select
          className="cmp-toolbar__select cmp-toolbar__sort"
          size="md"
          icon="sliders"
          hideLabel
          label={t('campaigns.list.sortLabel')}
          options={SORTS.map((sort) => ({ value: sort, label: t(`campaigns.list.sort.${sort}`) }))}
          value={filters.sort}
          onValueChange={(sort) => onChange({ sort })}
        />
      </div>
    </div>
  );
}
