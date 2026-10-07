import { Skeleton } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';

const TAB_WIDTHS = [96, 120, 132, 120];
const ROWS = [0, 1, 2, 3];

export function CampaignsSkeleton() {
  const { t } = useI18n();
  return (
    <div className="cab-stack cab-stack--tight" aria-busy="true" aria-label={t('campaigns.list.loading')}>
      <div className="cmp-toolbar">
        <div className="cmp-skel-tabs">
          {TAB_WIDTHS.map((width, index) => (
            <Skeleton key={index} width={width} height={20} />
          ))}
        </div>
        <div className="cmp-toolbar__row">
          <Skeleton variant="block" width="100%" height={44} />
        </div>
      </div>
      <ul className="cmp-list">
        {ROWS.map((row) => (
          <li key={row} className="cab-card cmp-row">
            <div className="cmp-row__grid">
              <Skeleton variant="block" width={96} height={54} />
              <div className="cmp-row__main">
                <Skeleton width="70%" height={16} />
                <Skeleton width="45%" height={12} />
              </div>
              <div className="cmp-row__status">
                <Skeleton width={96} height={26} />
              </div>
              <div className="cmp-row__budget">
                <div className="cab-cell-budget">
                  <Skeleton width="100%" height={6} />
                  <Skeleton width="70%" height={12} />
                </div>
              </div>
              <div className="cmp-row__shows">
                <Skeleton width={56} height={18} />
              </div>
              <div className="cmp-row__action">
                <Skeleton variant="block" width={120} height={44} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
