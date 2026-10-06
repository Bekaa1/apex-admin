import { Link, NavLink, useNavigate } from 'react-router';
import { DEFAULT_AUTH_LINKS } from '../auth/links';
import { Icon, LogoMark } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { SUPPORT_WHATSAPP_URL } from '../lib/contacts';
import { AccountBlock } from './AccountBlock';
import { CABINET_ROOT, CABINET_SECTIONS, cabinetUrl } from './sections';

export function SideNav() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <aside className="cab__side">
      <div className="cab__side-inner">
        <Link className="ax-logo cab__logo" to={CABINET_ROOT} aria-label="Apexmedia">
          <LogoMark size={28} />
          <span className="ax-logo__word" style={{ fontSize: 20 }}>
            apexmedia
          </span>
        </Link>
        <nav className="cab-nav" aria-label={t('cabinet.nav.label')}>
          <ul className="cab-nav__list">
            {CABINET_SECTIONS.map((section) => (
              <li key={section.id}>
                <NavLink className="cab-nav__item" to={cabinetUrl(section.path)} end={!section.path}>
                  <Icon name={section.icon} />
                  <span className="cab-nav__label">{t(section.labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="cab__side-bottom">
          <a className="cab-nav__item" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="message-circle" />
            <span className="cab-nav__label">{t('cabinet.nav.help')}</span>
          </a>
          <AccountBlock />
          {/* Sign-out belongs to the auth flow; until it lands, leaving the cabinet just opens the login screen. */}
          <button type="button" className="cab-nav__item cab-nav__item--button" onClick={() => navigate(DEFAULT_AUTH_LINKS.login)}>
            <Icon name="log-out" />
            <span className="cab-nav__label">{t('cabinet.nav.logout')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
