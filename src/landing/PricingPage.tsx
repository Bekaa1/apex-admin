import { Button, Disclosure, DisclosureGroup, Icon } from '../design-system';
import { TARIFFS, TARIFF_FEATURES } from '../cabinet/tariffs';
import { useI18n } from '../i18n/i18n';
import { formatMoney } from '../lib/format';
import { SUPPORT_WHATSAPP_URL } from '../lib/contacts';
import { CampaignLink } from './CampaignLink';
import { PageHeading } from './PageParts';
import styles from './PublicPages.module.css';

export function PricingPage() {
  const { t, lang } = useI18n();
  return <div className={styles.page}>
    <PageHeading page="pricing" />
    <div className={styles.pricingGrid}>
      {TARIFFS.map((tariff) => <article key={tariff.code} className={`${styles.plan} ${tariff.code === 'zones' ? styles.featuredPlan : ''}`}>
        <div className={styles.planTop}><span className={styles.iconTile}><Icon name={tariff.code === 'standard' ? 'cart' : tariff.code === 'zones' ? 'shelf' : 'zap'} size={24} /></span><span className={styles.planTag}>{t(`public.pricing.tag.${tariff.code}`)}</span></div>
        <h2>{t(`cabinet.tariffs.${tariff.code}.name`)}</h2>
        <p className={styles.planDescription}>{t(`cabinet.tariffs.${tariff.code}.text`)}</p>
        <div className={styles.price}><span>{t('cabinet.tariffs.minimum')}</span><strong>{t('cabinet.tariffs.from', { amount: formatMoney(tariff.minimum, lang) })}</strong></div>
        <CampaignLink tariff={tariff.code} variant={tariff.code === 'zones' ? 'primary' : 'secondary'} fullWidth>{t('public.pricing.choose')}</CampaignLink>
        <ul className={styles.features}>{TARIFF_FEATURES.slice(0, 3).map((feature, index) => <li key={feature} className={index < tariff.level ? styles.included : styles.excluded}><Icon name={index < tariff.level ? 'check-circle' : 'minus'} size={18} /><span><span className="ax-sr">{t(index < tariff.level ? 'cabinet.tariffs.has' : 'cabinet.tariffs.hasNot')} </span>{t(`cabinet.tariffs.feature.${feature}`)}</span></li>)}</ul>
      </article>)}
    </div>
    <section className={styles.corporate}>
      <span className={styles.iconTile}><Icon name="building" size={28} /></span>
      <div><p className={styles.eyebrow}>{t('cabinet.tariffs.byAgreement')}</p><h2>{t('cabinet.tariffs.corporate.name')}</h2><p>{t('cabinet.tariffs.corporate.text')}</p></div>
      <Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="inverse" iconRight="arrow-up-right">{t('public.pricing.discuss')}</Button>
    </section>
    <section className={styles.terms}><Icon name="shield-check" size={24} /><div><h2>{t('public.pricing.contractTitle')}</h2><p>{t('public.pricing.contractText')}</p></div></section>
    <section className={styles.faq}><h2>{t('public.faq')}</h2><DisclosureGroup>{['budget', 'zones', 'renewal'].map((key) => <Disclosure key={key} summary={t(`public.pricing.faq.${key}.q`)}>{t(`public.pricing.faq.${key}.a`)}</Disclosure>)}</DisclosureGroup></section>
  </div>;
}
