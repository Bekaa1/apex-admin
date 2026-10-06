import { Disclosure, DisclosureGroup } from '../../design-system';
import { useI18n } from '../../i18n/i18n';

const QUESTIONS = ['format', 'start', 'impression', 'budgetEnd', 'payment'] as const;

export function HomeFaq() {
  const { t } = useI18n();
  return (
    <section className="cab-card cab-faq" aria-labelledby="faq-title">
      <h2 className="cab-h2" id="faq-title">
        {t('home.faq.title')}
      </h2>
      <DisclosureGroup>
        {QUESTIONS.map((q, i) => (
          <Disclosure key={q} summary={t(`home.faq.${q}.q`)} defaultOpen={i === 0}>
            <p>{t(`home.faq.${q}.a`)}</p>
          </Disclosure>
        ))}
      </DisclosureGroup>
    </section>
  );
}
