import { Icon, Timeline, type TimelineItem } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney } from '../../../lib/format';
import { MODERATION_RULES } from '../rules';
import type { CampaignStage, Moderation } from '../types';

function BeforeLaunch({ items, note }: { items: TimelineItem[]; note?: string }) {
  const { t } = useI18n();
  const label = t('campaigns.row.beforeLaunch');
  return (
    <div className="cmp-row__foot">
      <span className="cmp-row__foot-label" aria-hidden="true">
        {label}
      </span>
      <Timeline
        orientation="horizontal"
        label={label}
        items={items}
        stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
      />
      {note ? (
        <p className="cmp-row__foot-note">
          <Icon name="mail" size={18} />
          {note}
        </p>
      ) : null}
    </div>
  );
}

function Returned({ moderation }: { moderation: Moderation }) {
  const { t } = useI18n();
  return (
    <div className="cmp-row__foot cmp-row__foot--danger">
      <Icon name="alert-circle" size={20} />
      <div className="cmp-row__reason">
        <p className="cmp-row__reason-title">{t('campaigns.row.returned')}</p>
        {moderation.rules.length ? (
          <ul>
            {moderation.rules.map((rule) => (
              <li key={rule}>{MODERATION_RULES.includes(rule) ? t(`campaigns.rules.${rule}`) : rule}</li>
            ))}
          </ul>
        ) : null}
        {moderation.comment ? <p className="cmp-row__comment">{t('campaigns.row.comment', { text: moderation.comment })}</p> : null}
      </div>
    </div>
  );
}

/** What is left before the launch, or why the moderator returned the campaign. */
export function CampaignRowFoot({ stage }: { stage: CampaignStage }) {
  const { t, lang } = useI18n();
  const launch: TimelineItem = { key: 'launch', title: t('campaigns.row.timeline.launch'), state: 'todo' };

  switch (stage.kind) {
    case 'review':
      return (
        <BeforeLaunch
          items={[
            { key: 'review', title: t('campaigns.row.timeline.review'), state: 'current' },
            stage.paid
              ? { key: 'payment', title: t('campaigns.row.timeline.paid'), state: 'done' }
              : { key: 'payment', title: t('campaigns.row.timeline.payment'), state: 'todo' },
            launch,
          ]}
        />
      );
    case 'awaitingPayment':
      return (
        <BeforeLaunch
          items={[
            { key: 'review', title: t('campaigns.row.timeline.approved'), state: 'done' },
            { key: 'payment', title: t('campaigns.row.timeline.payment'), state: 'current' },
            launch,
          ]}
          note={stage.invoice ? t('campaigns.row.invoiceSent', { amount: formatMoney(stage.invoice.amount, lang), email: stage.invoice.sentTo }) : undefined}
        />
      );
    case 'rejected':
      return stage.moderation ? <Returned moderation={stage.moderation} /> : null;
    default:
      return null;
  }
}
