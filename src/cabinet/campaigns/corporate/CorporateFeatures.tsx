import { useId } from 'react';
import { Icon, type IconName } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';

const FEATURES: Array<{ key: string; icon: IconName }> = [
  { key: 'reach', icon: 'store' },
  { key: 'exclusive', icon: 'target' },
  { key: 'shelves', icon: 'shelf' },
  { key: 'shows', icon: 'zap' },
  { key: 'formats', icon: 'video' },
  { key: 'reports', icon: 'pie-chart' },
];

/** «Что входит». */
export function CorporateFeatures() {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <section className="cab-section" aria-labelledby={titleId}>
      <div className="cab-head">
        <div className="cab-head__copy">
          <h2 className="cab-h2" id={titleId}>
            {t('campaigns.corporate.whatTitle')}
          </h2>
          <p className="cab-lead">{t('campaigns.corporate.whatLead')}</p>
        </div>
      </div>
      <ul className="cmp-corp-features">
        {FEATURES.map((feature) => (
          <li key={feature.key} className="cab-card cmp-corp-feature">
            <span className="cab-tile cab-tile--accent cab-tile--md" aria-hidden="true">
              <Icon name={feature.icon} size={22} />
            </span>
            <h3 className="cmp-corp-feature__title">{t(`campaigns.corporate.features.${feature.key}.title`)}</h3>
            <p className="cab-small">{t(`campaigns.corporate.features.${feature.key}.text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
