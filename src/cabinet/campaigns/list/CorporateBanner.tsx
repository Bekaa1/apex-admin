import { useId } from 'react';
import { Link, useLocation } from 'react-router';
import { Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { CABINET_LINKS } from '../../sections';

export function CorporateBanner() {
  const { t } = useI18n();
  const location = useLocation();
  const titleId = useId();
  return (
    <aside className="cab-card cmp-corp-banner" aria-labelledby={titleId}>
      <span className="cab-tile cab-tile--accent cab-tile--md" aria-hidden="true">
        <Icon name="briefcase" size={22} />
      </span>
      <div className="cmp-corp-banner__copy">
        <h2 className="cmp-corp-banner__title" id={titleId}>
          {t('campaigns.banner.title')}
        </h2>
        <p className="cab-small">{t('campaigns.banner.text')}</p>
      </div>
      <Link className="cab-link cab-link--more" to={CABINET_LINKS.corporate} state={{ returnTo: location.pathname + location.search }}>
        {t('campaigns.banner.more')}
        <Icon name="arrow-right" size={18} />
      </Link>
    </aside>
  );
}
