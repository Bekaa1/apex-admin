import { Badge, Icon, Meter } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatMoney } from '../../lib/format';

const RULES = ['own', 'minimum', 'spending'] as const;

// A worked example from the design: 1 000 000 ₸ budget, 880 000 ₸ spent.
const EXAMPLE = { total: 1_000_000, spent: 880_000 };

export function GuideBudget() {
  const { t, lang } = useI18n();
  const left = EXAMPLE.total - EXAMPLE.spent;
  const spentPct = Math.round((EXAMPLE.spent / EXAMPLE.total) * 100);
  return (
    <section className="cab-card cab-budget" aria-labelledby="budget-title">
      <div className="cab-budget__copy">
        <h2 className="cab-h2" id="budget-title">
          {t('home.budget.title')}
        </h2>
        <ol className="cab-rules">
          {RULES.map((rule, i) => (
            <li key={rule}>
              <span className="cab-rules__num" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <strong>{t(`home.budget.${rule}.title`)}</strong>
                <span>{t(`home.budget.${rule}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <figure className="cab-budget__example">
        <figcaption className="cab-budget__example-head">
          <Badge>{t('home.budget.example')}</Badge>
          <span className="cab-budget__campaign">
            <strong>{t('home.budget.exampleCampaign')}</strong>
            <span>{t('home.tariffs.zones.name')}</span>
          </span>
        </figcaption>
        <div className="cab-budget__total">
          <span>{t('home.budget.total')}</span>
          <strong>{formatMoney(EXAMPLE.total, lang)}</strong>
        </div>
        <Meter value={spentPct} tone="warning" label={t('home.campaigns.spent', { pct: spentPct })} />
        <dl className="cab-budget__split">
          <div>
            <dt>{t('home.budget.spent')}</dt>
            <dd>{formatMoney(EXAMPLE.spent, lang)}</dd>
          </div>
          <div>
            <dt>{t('home.budget.left')}</dt>
            <dd>{formatMoney(left, lang)}</dd>
          </div>
        </dl>
        <p className="cab-budget__hint">
          <Icon name="alert-triangle" size={18} />
          {t('home.budget.hint', { pct: 100 - spentPct })}
        </p>
        <span className="cab-budget__fake-btn" aria-hidden="true">
          <Icon name="plus" size={18} />
          {t('home.budget.topUp')}
        </span>
      </figure>
    </section>
  );
}
