import { useId } from 'react';
import { Timeline } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatDayMonth, formatMoney } from '../../../lib/format';
import type { CampaignDetails } from './types';

export function DetailsHistory({ details }: { details: CampaignDetails }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  if (!details.history.length) return null;
  return (
    <section className="cab-card cmpd-card cmpd-card--history" aria-labelledby={titleId}>
      <h2 className="cab-h3" id={titleId}>
        {t('campaigns.details.history.title')}
      </h2>
      <Timeline
        className="cmpd-history"
        label={t('campaigns.details.history.title')}
        stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
        items={details.history.map((event) => ({
          key: event.key,
          title: t(`campaigns.details.history.${event.kind}`, { amount: event.amount === undefined ? '' : formatMoney(event.amount, lang) }),
          text: event.date ? formatDayMonth(event.date, lang) : undefined,
          state: event.current ? 'current' : 'done',
        }))}
      />
    </section>
  );
}
