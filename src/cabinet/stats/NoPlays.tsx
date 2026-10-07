import { Button, Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import type { StatsMeta, StatsScope } from './types';

/** The chosen campaigns had no plays in the period; «Всё время» is one click away. */
export function NoPlays({ meta, scope, single, onAllTime }: { meta: StatsMeta; scope: StatsScope; single: boolean; onAllTime: () => void }) {
  const { t } = useI18n();
  const allTime = meta.period === 'all';
  let text = t(single ? 'stats.noPlays.campaign' : `stats.noPlays.${scope}`);
  if (allTime) text = t('stats.noPlays.soon');
  return (
    <div className="cab-card cmp-empty cmp-empty--small">
      <span className="cab-tile cab-tile--brand cab-tile--md" aria-hidden="true">
        <Icon name="chart" size={22} />
      </span>
      <h2 className="cab-h3">{t(allTime ? 'stats.noPlays.titleAll' : 'stats.noPlays.title')}</h2>
      <p className="cab-muted">{text}</p>
      {allTime ? null : (
        <Button variant="secondary" size="md" onClick={onAllTime}>
          {t('stats.noPlays.showAll')}
        </Button>
      )}
    </div>
  );
}
