import { Skeleton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';

const TILES = [0, 1, 2, 3];
// Column heights of the placeholder chart, as drawn.
const COLUMNS = [52, 38, 64, 45, 71, 58, 30, 66, 49, 80, 62, 41, 57, 74, 36, 68, 50, 87, 60, 44, 70, 55, 39, 63];

export function StatsSkeleton() {
  const { t } = useI18n();
  return (
    <div className="cab-stack cab-stack--tight" aria-busy="true" aria-label={t('stats.loading')}>
      <section className="cab-kpis">
        {TILES.map((tile) => (
          <div key={tile} className="ax-stat">
            <Skeleton width="55%" />
            <Skeleton width="70%" height={30} />
            <Skeleton width="40%" height={12} />
          </div>
        ))}
      </section>
      <div className="cab-card st-card">
        <Skeleton width={200} height={22} />
        <div className="st-skel-cols">
          {COLUMNS.map((height, index) => (
            <Skeleton key={index} variant="block" width="100%" height={`${height}%`} />
          ))}
        </div>
      </div>
      <div className="cab-card st-card">
        <Skeleton width={180} height={22} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="80%" height={14} />
      </div>
    </div>
  );
}
