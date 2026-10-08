import { useEffect } from 'react';
import { useMatches } from 'react-router';
import { cx, Icon, LANG_OPTIONS, SegmentedControl, ThemeToggle } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { NotificationsButton } from './notifications/NotificationsButton';
import { CABINET_LINKS, routeHidesCreate, routeTitleKey } from './sections';
import { ButtonLink } from './ui/ButtonLink';
import { usePopover } from './ui/usePopover';

function usePageHandle(): { titleKey: string | undefined; hideCreate: boolean } {
  const matches = useMatches();
  return {
    titleKey: matches.map((match) => routeTitleKey(match.handle)).findLast(Boolean),
    hideCreate: matches.some((match) => routeHidesCreate(match.handle)),
  };
}

function Preferences() {
  const { t, lang, setLang } = useI18n();
  return (
    <>
      <SegmentedControl className="cab__lang" label={t('common.langLabel')} options={LANG_OPTIONS} value={lang} onChange={setLang} />
      <ThemeToggle labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
    </>
  );
}

/** Phone: language and theme behind one button, so the page title keeps its room next to the bell. */
function PreferencesMenu() {
  const { t } = useI18n();
  const { open, rootRef, panelId, buttonProps } = usePopover();
  const label = t('cabinet.preferences');
  return (
    <div ref={rootRef} className="cab__prefs-menu">
      <button type="button" className={cx('ax-iconbtn', open && 'is-open')} aria-label={label} title={label} aria-haspopup="dialog" {...buttonProps}>
        <Icon name="sliders" />
      </button>
      {open ? (
        <div id={panelId} className="cab__prefs-panel" role="dialog" aria-label={label}>
          <Preferences />
        </div>
      ) : null}
    </div>
  );
}

export function TopBar() {
  const { t } = useI18n();
  const { titleKey, hideCreate } = usePageHandle();
  const title = titleKey ? t(titleKey) : '';

  useEffect(() => {
    document.title = title ? `${title} · Apexmedia` : 'Apexmedia';
  }, [title]);

  return (
    <header className="cab__top">
      <h1 className="cab__title">{title}</h1>
      <div className="cab__top-actions">
        <div className="cab__prefs">
          <Preferences />
        </div>
        <PreferencesMenu />
        <NotificationsButton />
        {hideCreate ? null : (
          <ButtonLink to={CABINET_LINKS.newCampaign} variant="inverse" size="md" iconLeft="plus" className="cab__create">
            {t('cabinet.createCampaign')}
          </ButtonLink>
        )}
      </div>
    </header>
  );
}
