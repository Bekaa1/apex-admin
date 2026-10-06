import { Skeleton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';

const TILES = [0, 1, 2, 3];
const ROWS = [0, 1, 2];

export function HomeSkeleton() {
  const { t } = useI18n();
  return (
    <div className="cab-stack cab-stack--tight" aria-busy="true" aria-label={t('home.summary.loading')}>
      <div className="cab-kpis">
        {TILES.map((tile) => (
          <div key={tile} className="ax-stat">
            <Skeleton width="55%" />
            <Skeleton width="70%" height={30} />
            <Skeleton width="40%" height={12} />
          </div>
        ))}
      </div>
      <div className="cab-card cab-campaigns">
        <Skeleton width={180} height={24} />
        {ROWS.map((row) => (
          <div key={row} className="cab-skel-row">
            <Skeleton variant="block" width={56} height={40} />
            <div className="cab-skel-row__text">
              <Skeleton width="60%" />
              <Skeleton width="35%" height={12} />
            </div>
            <Skeleton width={96} height={26} />
            <div className="cab-skel-row__text">
              <Skeleton width="100%" height={6} />
              <Skeleton width="70%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
