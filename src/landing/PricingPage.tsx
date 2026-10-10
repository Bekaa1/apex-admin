import { useId, useState } from 'react';
import { Button, ChoiceCard, Disclosure, DisclosureGroup, Icon } from '../design-system';
import { CORPORATE_TARIFF, RECOMMENDED_TARIFF, TARIFFS, termsOf, type TariffCode } from '../cabinet/tariffs';
import { TariffPoints, TariffPrice, TariffTop } from '../cabinet/ui/TariffParts';
import { useTariffTerms } from '../cabinet/useTariffTerms';
import { useI18n } from '../i18n/i18n';
import { SUPPORT_WHATSAPP_URL } from '../lib/contacts';
import { CampaignLink } from './CampaignLink';
import { PageHeading } from './PageParts';
import styles from './PublicPages.module.css';

/** «Эксклюзив» under the three plans: one wide card, its advantages in two columns. */
function ExclusiveCard() {
  const { t } = useI18n();
  const titleId = useId();
  return <section className={styles.corporate} aria-labelledby={titleId}>
    <div className={styles.corporateHead}>
      <TariffTop look={CORPORATE_TARIFF} />
      <h2 id={titleId}>{t('cabinet.tariffs.corporate.name')}</h2>
      <TariffPrice code="corporate" minimum={null} className={styles.corporatePrice} />
    </div>
    <TariffPoints code="corporate" look={CORPORATE_TARIFF} className={styles.corporatePoints} />
    <Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="secondary" iconRight="arrow-up-right" className={styles.corporateCta}>{t('cabinet.tariffs.offer')}</Button>
  </section>;
}

export function PricingPage() {
  const { t } = useI18n();
  const tariffs = useTariffTerms();
  // Picking a plan highlights it like the wizard's plan step; the recommended «Премиум» is picked at first.
  const [selected, setSelected] = useState<TariffCode>(RECOMMENDED_TARIFF);
  // Minimums come from the `tariffs` table; plans off sale are hidden, «—» while the terms load.
  const terms = tariffs.status === 'ready' ? tariffs.terms : null;
  const plans = TARIFFS.flatMap((tariff) => {
    const plan = terms ? termsOf(terms, tariff.code) : null;
    return terms && !plan ? [] : [{ ...tariff, plan }];
  });
  return <div className={styles.page}>
    <PageHeading page="pricing" />
    <fieldset className={styles.pricingChoices}>
      <legend className="ax-sr">{t('landing.nav.pricing')}</legend>
      <div className={styles.pricingGrid}>
        {plans.map((tariff) => {
          const name = t(`cabinet.tariffs.${tariff.code}.name`);
          return <ChoiceCard
            key={tariff.code}
            className={styles.planChoice}
            name="pricing-tariff"
            value={tariff.code}
            checked={selected === tariff.code}
            onChange={() => setSelected(tariff.code)}
            top={<TariffTop look={tariff} recommended={tariff.code === RECOMMENDED_TARIFF} />}
            title={name}
          >
            <TariffPrice code={tariff.code} minimum={tariff.plan?.minimum ?? null} />
            <TariffPoints code={tariff.code} look={tariff} className={styles.planPoints} />
            <CampaignLink tariff={tariff.code} variant={selected === tariff.code ? 'primary' : 'secondary'} fullWidth className={styles.planCta} aria-label={`${t('cabinet.tariffs.choose')}: ${name}`}>{t('cabinet.tariffs.choose')}</CampaignLink>
          </ChoiceCard>;
        })}
      </div>
    </fieldset>
    <ExclusiveCard />
    <section className={styles.terms}><Icon name="shield-check" size={24} /><div><h2>{t('public.pricing.contractTitle')}</h2><p>{t('public.pricing.contractText')}</p></div></section>
    <section className={styles.faq}><h2>{t('public.faq')}</h2><DisclosureGroup>{['budget', 'zones', 'renewal'].map((key) => <Disclosure key={key} summary={t(`public.pricing.faq.${key}.q`)}>{t(`public.pricing.faq.${key}.a`)}</Disclosure>)}</DisclosureGroup></section>
  </div>;
}
