import { NavLink } from 'react-router';
import { Icon } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { ADMIN_SECTIONS, visibleAdminSections } from './sections';
import { usePermissions } from '../auth/usePermissions';
import styles from './AdminLayout.module.css';

export function AdminNavigation({ onNavigate, preview = false }: { onNavigate?: () => void; preview?: boolean }) {
  const { t } = useI18n();
  const { roles } = usePermissions();
  const sections = preview && import.meta.env.DEV ? ADMIN_SECTIONS : visibleAdminSections(roles);
  return <nav className="cab-nav" aria-label={t('adminShell.menu')}>
    {[false, true].map((secondary) => <ul className={secondary ? `cab-nav__list ${styles.secondary}` : 'cab-nav__list'} key={String(secondary)}>
      {sections.filter((section) => Boolean(section.secondary) === secondary).map((section) => <li key={section.path}>
        <NavLink className="cab-nav__item" to={section.path} end={section.path === '/admin'} onClick={onNavigate}>
          <Icon name={section.icon} /><span className="cab-nav__label">{t(section.labelKey)}</span>
        </NavLink>
      </li>)}
    </ul>)}
  </nav>;
}
