import { Button, Icon } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { SUPPORT_WHATSAPP_URL } from '../lib/contacts';
import { CampaignLink } from './CampaignLink';
import styles from './PublicPages.module.css';

/** `level={2}` for a heading inside a page that already has its h1 (the landing). */
export function PageHeading({ page, level = 1, titleId }: { page: 'pricing' | 'stores' | 'how'; level?: 1 | 2; titleId?: string }) {
  const { t } = useI18n();
  const Title = level === 1 ? 'h1' : 'h2';
  return <header className={styles.heading}>
    <p className={styles.eyebrow}><span />{t(`public.${page}.eyebrow`)}</p>
    <Title id={titleId}>{t(`public.${page}.title`)}</Title>
    <p className={styles.lead}>{t(`public.${page}.text`)}</p>
  </header>;
}

export function StartBanner() {
  const { t } = useI18n();
  return <section className={styles.startBanner}>
    <div><Icon name="megaphone" size={32} /><h2>{t('public.start.title')}</h2><p>{t('public.start.text')}</p></div>
    <div className={styles.bannerActions}>
      <CampaignLink iconRight="arrow-right">{t('landing.hero.ctaPrimary')}</CampaignLink>
      <Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" variant="secondary">{t('public.start.help')}</Button>
    </div>
  </section>;
}
