import { StatTile, type StatDeltaTone } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatCompactNumber, formatDelta, formatList, formatMoney, formatNumber, pluralCategory } from '../../lib/format';
import type { HomeData } from './types';

function deltaTone(delta: number): StatDeltaTone {
  if (delta > 0) return 'success';
  return delta < 0 ? 'danger' : 'neutral';
}

export function KpiTiles({ data }: { data: HomeData }) {
  const { t, lang } = useI18n();
  const { playsDelta } = data;
  return (
    <section aria-label={t('home.summary.label')} className="cab-kpis">
      <StatTile
        icon="megaphone"
        label={t('home.summary.active')}
        value={formatNumber(data.activeCount, lang)}
        meta={t(`home.summary.activeOf.${pluralCategory(data.totalCount, lang)}`, { count: formatNumber(data.totalCount, lang) })}
      />
      <StatTile
        icon="play"
        label={t('home.summary.plays')}
        value={formatCompactNumber(data.plays7d, lang)}
        delta={
          playsDelta === null
            ? undefined
            : { text: formatDelta(playsDelta, lang), tone: deltaTone(playsDelta), icon: playsDelta > 0 ? 'trending-up' : undefined }
        }
        meta={playsDelta === null ? undefined : t('home.summary.playsDelta')}
      />
      <StatTile icon="wallet" label={t('home.summary.budgetLeft')} value={formatMoney(data.budgetLeft, lang)} meta={t('home.summary.budgetLeftMeta')} />
      <StatTile
        icon="store"
        label={t('home.summary.stores')}
        value={formatNumber(data.storesCount, lang)}
        meta={data.cities.length ? formatList(data.cities, lang) : undefined}
      />
    </section>
  );
}
