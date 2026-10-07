import { useId } from 'react';
import { Icon, type IconName } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney } from '../../../lib/format';
import { CABINET_LINKS, CABINET_ROOT } from '../../sections';
import { TARIFFS } from '../../tariffs';
import { ButtonLink } from '../../ui/ButtonLink';
import { CorporateBanner } from './CorporateBanner';

const STEPS = ['media', 'tariff', 'stores', 'zones', 'budget'];
const PREP: Array<{ key: string; icon: IconName }> = [
  { key: 'video', icon: 'video' },
  { key: 'cover', icon: 'image' },
  { key: 'budget', icon: 'wallet' },
];

/** The advertiser has no campaigns yet. */
export function CampaignsEmpty() {
  const { t, lang } = useI18n();
  const titleId = useId();
  const prepId = useId();
  const minimum = formatMoney(Math.min(...TARIFFS.map((tariff) => tariff.minimum)), lang);
  return (
    <div className="cab-stack cab-stack--tight">
      <section className="cab-card cmp-empty" aria-labelledby={titleId}>
        <div className="cmp-empty__art" aria-hidden="true">
          <span className="cmp-empty__card cab-thumb--1">
            <Icon name="play" size={22} />
          </span>
          <span className="cmp-empty__card cab-thumb--2">
            <Icon name="play" size={22} />
          </span>
          <span className="cmp-empty__plus">
            <Icon name="plus" size={26} />
          </span>
        </div>
        <h2 className="cab-h2" id={titleId}>
          {t('campaigns.empty.title')}
        </h2>
        <p className="cab-lead cmp-empty__lead">{t('campaigns.empty.lead', { amount: minimum })}</p>
        <div className="cmp-empty__ctas">
          <ButtonLink to={CABINET_LINKS.newCampaign} variant="primary" size="lg" iconLeft="plus">
            {t('cabinet.createCampaign')}
          </ButtonLink>
          {/* Home shows the step-by-step guide to an advertiser without campaigns. */}
          <ButtonLink to={CABINET_ROOT} variant="ghost" size="lg">
            {t('campaigns.empty.how')}
          </ButtonLink>
        </div>
        <ol className="cab-chain cmp-empty__chain" aria-label={t('campaigns.stepsLabel')}>
          {STEPS.map((step, i) => (
            <li key={step}>
              <span aria-hidden="true">{i + 1}</span>
              {t(`campaigns.steps.${step}`)}
            </li>
          ))}
        </ol>
      </section>
      <section className="cmp-prep" aria-labelledby={prepId}>
        <h2 className="cab-h3" id={prepId}>
          {t('campaigns.empty.prepTitle')}
        </h2>
        <ul className="cmp-prep__list">
          {PREP.map((item) => (
            <li key={item.key} className="cab-card cmp-prep__item">
              <span className="cab-tile cab-tile--brand cab-tile--md" aria-hidden="true">
                <Icon name={item.icon} size={22} />
              </span>
              <span className="cmp-prep__copy">
                <strong>{t(`campaigns.empty.prep.${item.key}.title`)}</strong>
                <span>{t(`campaigns.empty.prep.${item.key}.text`, { amount: minimum })}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <CorporateBanner />
    </div>
  );
}
