import { Button, Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_URL } from '../../lib/contacts';

/** «Поможем с первым запуском» for new advertisers, «Нужна помощь с кампанией?» otherwise. */
export function SupportCard({ firstLaunch = false }: { firstLaunch?: boolean }) {
  const { t, tRich } = useI18n();
  return (
    <aside className="cab-card cab-support" aria-labelledby="support-title">
      <span className="cab-tile cab-tile--success cab-tile--md" aria-hidden="true">
        <Icon name="message-circle" size={22} />
      </span>
      <h2 className="cab-h3" id="support-title">
        {t(firstLaunch ? 'home.support.titleFirst' : 'home.support.title')}
      </h2>
      <p className="cab-muted">{t('home.support.text')}</p>
      <Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="secondary" size="md" iconLeft="message-circle">
        {t('home.support.whatsapp')}
      </Button>
      <p className="cab-small">
        {tRich('home.support.email', {}, {
          email: (
            <a className="cab-link" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          ),
        })}
      </p>
    </aside>
  );
}
