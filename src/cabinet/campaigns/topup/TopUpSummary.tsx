import { useId } from 'react';
import { Timeline } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatNumber, pluralKey } from '../../../lib/format';
import { aboutPlays } from '../playsText';

interface TopUpSummaryProps {
  amount: number | null;
  /** The plan's price of a play: the amount buys about amount / price plays. */
  pricePerPlay: number;
  days: number | null;
  email: string;
}

/** «Итого»: the amount to pay, how many plays it buys, how long it lasts and what happens next. */
export function TopUpSummary({ amount, pricePerPlay, days, email }: TopUpSummaryProps) {
  const { t, lang } = useI18n();
  const titleId = useId();
  return (
    <section className="cab-card cmp-summary" aria-labelledby={titleId}>
      <h3 className="cmp-aside-card__title" id={titleId}>
        {t('campaigns.topUp.summary.title')}
      </h3>
      <div className="cmp-summary__total">
        <span>{t('campaigns.topUp.summary.toPay')}</span>
        <strong>{amount === null ? '—' : formatMoney(amount, lang)}</strong>
        {amount ? (
          <span className="cmp-summary__sub">
            {aboutPlays(t, lang, amount, pricePerPlay)}
          </span>
        ) : null}
        {days !== null ? (
          <span className="cmp-summary__sub">
            {t('campaigns.topUp.summary.enough', { days: t(pluralKey('campaigns.details.budget.days', days, lang), { count: formatNumber(days, lang) }) })}
          </span>
        ) : null}
      </div>
      <h4 className="cmpt-next-title">{t('campaigns.topUp.next.title')}</h4>
      <Timeline
        stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
        items={[
          { key: 'payment', title: t('campaigns.topUp.next.payment'), text: t('campaigns.topUp.next.paymentText', { email }), state: 'todo' },
          { key: 'resume', title: t('campaigns.row.timeline.resume'), text: t('campaigns.topUp.next.resumeText'), state: 'todo' },
        ]}
      />
    </section>
  );
}
