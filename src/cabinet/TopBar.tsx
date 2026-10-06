import { useEffect } from 'react';
import { useMatches } from 'react-router';
import { LANG_OPTIONS, SegmentedControl, ThemeToggle } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { CABINET_LINKS, routeTitleKey } from './sections';
import { ButtonLink } from './ui/ButtonLink';

function usePageTitleKey(): string | undefined {
  const matches = useMatches();
  return matches.map((match) => routeTitleKey(match.handle)).findLast(Boolean);
}

export function TopBar() {
  const { t, lang, setLang } = useI18n();
  const titleKey = usePageTitleKey();
  const title = titleKey ? t(titleKey) : '';

  useEffect(() => {
    document.title = title ? `${title} · Apexmedia` : 'Apexmedia';
  }, [title]);

  return (
    <header className="cab__top">
      <h1 className="cab__title">{title}</h1>
      <div className="cab__top-actions">
        <SegmentedControl className="cab__lang" label={t('common.langLabel')} options={LANG_OPTIONS} value={lang} onChange={setLang} />
        <ThemeToggle labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
        <ButtonLink to={CABINET_LINKS.newCampaign} variant="inverse" size="md" iconLeft="plus" className="cab__create">
          {t('cabinet.createCampaign')}
        </ButtonLink>
      </div>
    </header>
  );
}
