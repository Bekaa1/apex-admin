import { Button, Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { CABINET_LINKS } from '../sections';
import { ButtonLink } from '../ui/ButtonLink';

const STEPS = ['video', 'tariff', 'stores', 'zones', 'budget'] as const;

export function NextCampaignCard({ onHowItWorks }: { onHowItWorks: () => void }) {
  const { t } = useI18n();
  return (
    <section className="cab-card cab-next" aria-labelledby="next-title">
      <span className="cab-tile cab-tile--brand cab-tile--md" aria-hidden="true">
        <Icon name="plus" size={22} />
      </span>
      <h2 className="cab-h3" id="next-title">
        {t('home.next.title')}
      </h2>
      <ol className="cab-chain">
        {STEPS.map((step, i) => (
          <li key={step}>
            <span aria-hidden="true">{i + 1}</span>
            {t(`home.steps.${step}.title`)}
          </li>
        ))}
      </ol>
      <div className="cab-next__ctas">
        <ButtonLink to={CABINET_LINKS.newCampaign} variant="primary" size="lg" iconLeft="plus">
          {t('cabinet.createCampaign')}
        </ButtonLink>
        <Button variant="ghost" size="lg" onClick={onHowItWorks}>
          {t('home.guide.how')}
        </Button>
      </div>
    </section>
  );
}
