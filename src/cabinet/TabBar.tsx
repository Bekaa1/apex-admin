import { NavLink } from 'react-router';
import { Icon } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { CABINET_SECTIONS, cabinetUrl } from './sections';

/** Phone navigation (≤760px); the side menu is hidden there. */
export function TabBar() {
  const { t } = useI18n();
  return (
    <nav className="cab-tabs" aria-label={t('cabinet.nav.label')}>
      {CABINET_SECTIONS.map((section) => (
        <NavLink key={section.id} className="cab-tabs__item" to={cabinetUrl(section.path)} end={!section.path}>
          <span className="cab-tabs__icon">
            <Icon name={section.icon} size={22} />
          </span>
          <span className="cab-tabs__label">{t(section.shortLabelKey ?? section.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
