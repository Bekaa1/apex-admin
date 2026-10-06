import type { ReactNode } from 'react';
import { Badge, Icon, type IconName } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { BudgetPreview, StoresPreview, TariffPreview, VideoPreview, ZonesPreview } from './GuideStepPreviews';

const STEPS: Array<{ key: string; preview: ReactNode; badge?: boolean }> = [
  { key: 'video', preview: <VideoPreview /> },
  { key: 'tariff', preview: <TariffPreview /> },
  { key: 'stores', preview: <StoresPreview /> },
  { key: 'zones', preview: <ZonesPreview />, badge: true },
  { key: 'budget', preview: <BudgetPreview /> },
];

const AFTER: Array<{ key: string; icon: IconName; tile: string }> = [
  { key: 'review', icon: 'shield-check', tile: 'cab-tile--warning' },
  { key: 'start', icon: 'play', tile: 'cab-tile--success' },
  { key: 'results', icon: 'chart', tile: 'cab-tile--brand' },
];

/** «Как создать кампанию»: the 5 wizard steps and what happens after payment. Anchor #how. */
export function GuideSteps() {
  const { t } = useI18n();
  return (
    <section className="cab-section" aria-labelledby="how-title" id="how">
      <div className="cab-head">
        <div className="cab-head__copy">
          <h2 className="cab-h2" id="how-title">
            {t('home.steps.title')}
          </h2>
          <p className="cab-lead">{t('home.steps.lead')}</p>
        </div>
      </div>
      <ol className="cab-steps">
        {STEPS.map((step, i) => (
          <li key={step.key} className="cab-step">
            <span className="cab-step__num">{i + 1}</span>
            <div className="cab-step__body">
              <h3 className="cab-step__title">{t(`home.steps.${step.key}.title`)}</h3>
              <p className="cab-step__text">{t(`home.steps.${step.key}.text`)}</p>
              {step.badge ? (
                <Badge tone="accent" className="cab-step__badge">
                  {t(`home.steps.${step.key}.badge`)}
                </Badge>
              ) : null}
            </div>
            <div className="cab-step__preview" aria-hidden="true">
              {step.preview}
            </div>
          </li>
        ))}
      </ol>
      <div className="cab-after">
        <p className="cab-after__title">{t('home.steps.after.title')}</p>
        <ol className="cab-after__list">
          {AFTER.map((item) => (
            <li key={item.key}>
              <span className={`cab-tile ${item.tile} cab-tile--sm`} aria-hidden="true">
                <Icon name={item.icon} size={18} />
              </span>
              <span>
                <strong>{t(`home.steps.after.${item.key}`)}</strong>
                <span>{t(`home.steps.after.${item.key}Text`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
