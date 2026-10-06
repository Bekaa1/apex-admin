import { Link } from 'react-router';
import { Icon, type IconName } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { CABINET_LINKS } from '../sections';

const LINKS: Array<{ id: 'campaigns' | 'stats' | 'analytics' | 'profile'; to: string; icon: IconName; tile: string }> = [
  { id: 'campaigns', to: CABINET_LINKS.campaigns, icon: 'megaphone', tile: 'cab-tile--brand' },
  { id: 'stats', to: CABINET_LINKS.stats, icon: 'chart', tile: 'cab-tile--success' },
  { id: 'analytics', to: CABINET_LINKS.analytics, icon: 'pie-chart', tile: 'cab-tile--accent' },
  { id: 'profile', to: CABINET_LINKS.profile, icon: 'user', tile: 'cab-tile--warning' },
];

export function SectionLinks() {
  const { t } = useI18n();
  return (
    <section className="cab-section" aria-labelledby="sections-title">
      <div className="cab-head">
        <div className="cab-head__copy">
          <h2 className="cab-h2" id="sections-title">
            {t('home.sections.title')}
          </h2>
        </div>
      </div>
      <ul className="cab-links">
        {LINKS.map((link) => (
          <li key={link.id}>
            <Link className="cab-card cab-linkcard" to={link.to}>
              <span className={`cab-tile ${link.tile} cab-tile--md`} aria-hidden="true">
                <Icon name={link.icon} size={22} />
              </span>
              <h3 className="cab-h3">{t(`cabinet.nav.${link.id}`)}</h3>
              <p className="cab-muted">{t(`home.sections.${link.id}`)}</p>
              <span className="cab-linkcard__more">
                {t('home.sections.open')}
                <Icon name="arrow-right" size={18} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
