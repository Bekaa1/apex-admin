import { Badge, Button, Icon, LogoMark } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { SUPPORT_WHATSAPP_URL } from '../../../lib/contacts';

// The design's manager numbers are placeholders; calls go to the support number behind the WhatsApp link.
const SUPPORT_PHONE = `+${new URL(SUPPORT_WHATSAPP_URL).pathname.slice(1)}`;
const PROMISES = ['exclusive', 'reach', 'budget', 'manager'];

export function CorporateHero({ titleId }: { titleId: string }) {
  const { t } = useI18n();
  return (
    <section className="cab-card cmp-corp-hero" aria-labelledby={titleId}>
      <div className="cmp-corp-hero__copy">
        <Badge tone="accent">{t('campaigns.corporate.badge')}</Badge>
        <h2 className="cab-hero__title" id={titleId}>
          {t('campaigns.corporate.title')}
        </h2>
        <p className="cab-hero__text">{t('campaigns.corporate.text')}</p>
        <div className="cab-hero__ctas">
          <Button href={`tel:${SUPPORT_PHONE}`} variant="secondary" size="lg" iconLeft="phone">
            {t('campaigns.corporate.call')}
          </Button>
          <Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="ghost" size="lg" iconLeft="message-circle">
            {t('campaigns.corporate.whatsapp')}
          </Button>
        </div>
      </div>
      <div className="cmp-corp-hero__panel">
        <LogoMark size={44} variant="white" />
        <p className="cmp-corp-hero__panel-title">{t('campaigns.corporate.panelTitle')}</p>
        <ul className="cmp-corp-hero__promises">
          {PROMISES.map((promise) => (
            <li key={promise}>
              <Icon name="check" size={18} strokeWidth={2.25} />
              {t(`campaigns.corporate.promises.${promise}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
