import { useState } from 'react';
import { Button, Disclosure, DisclosureGroup, Icon, type IconName } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { formatMoney } from '../lib/format';
import { TARIFFS } from '../cabinet/tariffs';
import { PageHeading, StartBanner } from './PageParts';
import styles from './PublicPages.module.css';

const STEPS = [
  { key: 'video', icon: 'video' }, { key: 'tariff', icon: 'layers' }, { key: 'stores', icon: 'store' },
  { key: 'zones', icon: 'shelf' }, { key: 'budget', icon: 'wallet' },
] satisfies { key: string; icon: IconName }[];

function ShelfIllustration() {
  const { t } = useI18n();
  return <figure className={styles.shelfFigure}>
    <div className={styles.shelfScene} aria-hidden="true">
      <div className={styles.shelfLabel}><Icon name="target" size={17} />{t('public.how.shelf')}</div>
      <div className={styles.shelves}>{[0, 1].map((row) => <div key={row}>{[0, 1, 2, 3, 4].map((item) => <span key={item} />)}</div>)}</div>
      <div className={styles.cartIllustration}>
        <div className={styles.cartScreen}><Icon name="play" size={34} /><span>0:07</span></div>
        <Icon name="cart" size={118} strokeWidth={1.2} />
      </div>
      <span className={styles.signal}><Icon name="zap" size={22} /></span>
    </div>
    <figcaption><Icon name="check-circle" size={18} />{t('public.how.sceneCaption')}</figcaption>
  </figure>;
}

function StepPreview({ step }: { step: number }) {
  const { t, lang } = useI18n();
  return <div className={styles.stepPreview}>
    <p className={styles.eyebrow}>{t('public.how.example')}</p>
    {step === 0 ? <><div className={styles.videoPreview}><Icon name="play" size={42} /><span>0:07</span></div><div className={styles.previewRow}><Icon name="video" />promo.mp4<Icon name="check-circle" /></div><div className={styles.chips}><span>MP4 / MOV</span><span>16:9</span><span>1280 × 720+</span></div></> : null}
    {step === 1 ? <div className={styles.previewPlans}>{TARIFFS.map((tariff) => <div key={tariff.code} className={tariff.code === 'zones' ? styles.selectedPreview : ''}><span><strong>{t(`cabinet.tariffs.${tariff.code}.name`)}</strong><small>{t('cabinet.tariffs.from', { amount: formatMoney(tariff.minimum, lang) })}</small></span><Icon name={tariff.code === 'zones' ? 'check-circle' : 'layers'} /></div>)}</div> : null}
    {step === 2 ? <><div className={styles.previewSearch}><Icon name="search" />{t('public.stores.search')}</div><div className={styles.previewPlans}>{[1, 2, 3].map((number) => <div key={number} className={number < 3 ? styles.selectedPreview : ''}><Icon name="store" /><span>{t('public.how.exampleStore', { n: number })}</span><Icon name={number < 3 ? 'check-circle' : 'plus'} /></div>)}</div><Button href="/stores" variant="secondary" size="md" fullWidth>{t('public.how.browseStores')}</Button></> : null}
    {step === 3 ? <><div className={styles.zonePreview}><Icon name="shelf" size={80} /></div><div className={styles.chips}>{['drinks', 'snacks', 'household'].map((key, index) => <span className={index < 2 ? styles.selectedPreview : ''} key={key}>{index < 2 ? <Icon name="check" size={16} /> : null}{t(`home.steps.zones.${key}`)}</span>)}</div><p className={styles.previewNote}>{t('public.how.zonesNote')}</p></> : null}
    {step === 4 ? <><div className={styles.budgetPreview}><Icon name="wallet" size={32} /><span>{t('public.how.budgetLabel')}</span><strong>{formatMoney(1_000_000, lang)}</strong></div><div className={styles.previewRow}><Icon name="check-circle" />{t('public.how.budgetHint')}</div><div className={styles.previewSubmit}><Icon name="send" size={18} />{t('public.how.reviewAction')}</div></> : null}
  </div>;
}

export function HowItWorksPage() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  return <div className={styles.page}>
    <div className={styles.howHero}><PageHeading page="how" /><ShelfIllustration /></div>
    <ol className={styles.buyerSteps}>{['approach', 'watch', 'count'].map((key, index) => <li key={key}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{t(`public.how.buyer.${key}.title`)}</h2><p>{t(`public.how.buyer.${key}.text`)}</p></div></li>)}</ol>
    <section className={styles.section}>
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>{t('public.how.forAdvertiser')}</p><h2>{t('public.how.stepsTitle')}</h2><p>{t('public.how.stepsText')}</p></div>
      <div className={styles.guideGrid}>
        <ol className={styles.stepList}>{STEPS.map((item, index) => <li key={item.key}><button type="button" className={step === index ? styles.selectedStep : ''} aria-pressed={step === index} aria-controls="public-step-preview" onClick={() => setStep(index)}><span className={styles.stepNumber}>{index + 1}</span><span><strong>{t(`public.how.steps.${item.key}.title`)}</strong><span>{t(`public.how.steps.${item.key}.text`)}</span></span><Icon name={item.icon} size={21} /></button></li>)}</ol>
        <div id="public-step-preview" className={styles.previewContainer} role="region" aria-label={t(`public.how.steps.${STEPS[step].key}.title`)}><StepPreview step={step} /></div>
      </div>
    </section>
    <section className={styles.afterGrid}>{(['review', 'launch', 'results'] as const).map((key, index) => <article key={key}><span className={styles.iconTile}><Icon name={index === 0 ? 'shield-check' : index === 1 ? 'play' : 'chart'} size={23} /></span><h2>{t(`public.how.after.${key}.title`)}</h2><p>{t(`public.how.after.${key}.text`)}</p></article>)}</section>
    <section className={styles.faq}><h2>{t('public.faq')}</h2><DisclosureGroup>{['video', 'timing', 'impression'].map((key) => <Disclosure key={key} summary={t(`public.how.faq.${key}.q`)}>{t(`public.how.faq.${key}.a`)}</Disclosure>)}</DisclosureGroup></section>
    <StartBanner />
  </div>;
}
