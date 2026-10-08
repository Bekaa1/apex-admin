import { useId } from 'react';
import { Alert, Icon, Timeline, type IconName, type TimelineItem } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatDayMonth, formatMoney } from '../../../lib/format';
import { useAccount } from '../../useAccount';
import { ReturnedAlert } from '../wizard/ReturnedAlert';
import type { CampaignDetails } from './types';

interface NowCardProps {
  tone: 'info' | 'warning';
  icon: IconName;
  title: string;
  text: string;
  steps: { label: string; items: TimelineItem[] };
}

function NowCard({ tone, icon, title, text, steps }: NowCardProps) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <section className={`cmpd-now cmpd-now--${tone}`} aria-labelledby={titleId} role="status">
      <Icon name={icon} size={22} />
      <div className="cmpd-now__body">
        <h2 className="cmpd-now__title" id={titleId}>
          {title}
        </h2>
        <p className="cmpd-now__text">{text}</p>
        <Timeline
          orientation="horizontal"
          label={steps.label}
          items={steps.items}
          stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
        />
      </div>
    </section>
  );
}

/** What is happening with the campaign now and what comes next; nothing while it simply runs. */
export function DetailsNow({ details }: { details: CampaignDetails }) {
  const { t, lang } = useI18n();
  const { contact } = useAccount();
  const { stage } = details;
  const email = details.email ?? contact ?? '';
  const launch: TimelineItem = { key: 'launch', title: t('campaigns.row.timeline.launch'), state: 'todo' };

  switch (stage.kind) {
    case 'review':
      return (
        <NowCard
          tone="info"
          icon="clock"
          title={t('campaigns.details.now.review.title')}
          text={t('campaigns.details.now.review.text', { email })}
          steps={{
            label: t('campaigns.row.beforeLaunch'),
            items: [
              { key: 'review', title: t('campaigns.row.timeline.review'), state: 'current' },
              stage.paid
                ? { key: 'payment', title: t('campaigns.row.timeline.paid'), state: 'done' }
                : { key: 'payment', title: t('campaigns.row.timeline.payment'), state: 'todo' },
              launch,
            ],
          }}
        />
      );
    case 'changesReview':
      return (
        <NowCard
          tone="info"
          icon="clock"
          title={t('campaigns.details.now.changes.title')}
          text={stage.since ? t('campaigns.details.now.changes.text', { date: formatDayMonth(stage.since, lang) }) : t('campaigns.details.now.changes.textNoDate')}
          steps={{
            label: t('campaigns.row.beforeResume'),
            items: [
              { key: 'review', title: t('campaigns.row.timeline.changesReview'), state: 'current' },
              { key: 'resume', title: t('campaigns.row.timeline.resume'), state: 'todo' },
            ],
          }}
        />
      );
    case 'awaitingPayment':
      return (
        <NowCard
          tone="warning"
          icon="receipt"
          title={t('campaigns.details.now.payment.title')}
          text={
            stage.invoice
              ? t('campaigns.details.now.payment.text', { amount: formatMoney(stage.invoice.amount, lang), email: stage.invoice.sentTo })
              : t('campaigns.details.now.payment.textNoInvoice')
          }
          steps={{
            label: t('campaigns.row.beforeLaunch'),
            items: [
              { key: 'review', title: t('campaigns.row.timeline.approved'), state: 'done' },
              { key: 'payment', title: t('campaigns.row.timeline.payment'), state: 'current' },
              launch,
            ],
          }}
        />
      );
    case 'rejected':
      return <ReturnedAlert moderation={stage.moderation} />;
    case 'noBudget':
      return (
        <Alert tone="warning" title={t('campaigns.details.now.noBudget.title')}>
          {t(details.canTopUp ? 'campaigns.details.now.noBudget.text' : 'campaigns.details.now.noBudget.textManager')}
        </Alert>
      );
    default:
      return null;
  }
}
