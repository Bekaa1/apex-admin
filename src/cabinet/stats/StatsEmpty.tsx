import { useId } from 'react';
import { Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { CABINET_LINKS } from '../sections';
import { ButtonLink } from '../ui/ButtonLink';

// Column heights of the placeholder chart, as drawn.
const ART = [38, 62, 46, 80, 58, 92, 70];
const POINTS = ['days', 'stores', 'carts', 'shelves'];

/** No campaign has been on the screens yet: what the page will show and where to go meanwhile. */
export function StatsEmpty({ waiting }: { waiting: number }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  return (
    <section className="cab-card cmp-empty" aria-labelledby={titleId}>
      <div className="st-empty__art" aria-hidden="true">
        {ART.map((height) => (
          <span key={height} style={{ height: `${height}%` }} />
        ))}
      </div>
      <h2 className="cab-h2" id={titleId}>
        {t('stats.empty.title')}
      </h2>
      <p className="cab-lead cmp-empty__lead">{t('stats.empty.lead')}</p>
      {waiting > 0 ? (
        <p className="st-empty__pending">
          <Icon name="clock" size={18} />
          {t('stats.empty.waiting', { count: formatNumber(waiting, lang) })}
        </p>
      ) : null}
      <div className="cmp-empty__ctas">
        <ButtonLink to={CABINET_LINKS.campaigns}>{t('stats.empty.toCampaigns')}</ButtonLink>
        <ButtonLink to={CABINET_LINKS.newCampaign} variant="ghost" iconLeft="plus">
          {t('stats.empty.create')}
        </ButtonLink>
      </div>
      <ul className="st-empty__list">
        {POINTS.map((point) => (
          <li key={point}>
            <Icon name="check" size={18} />
            {t(`stats.empty.points.${point}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
