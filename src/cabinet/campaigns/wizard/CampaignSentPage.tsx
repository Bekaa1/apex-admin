import '../campaigns.css';
import { useId } from 'react';
import { Navigate, useLocation } from 'react-router';
import { listReturnTo } from '../../../navigation/returnTo';
import { Icon, Timeline } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney } from '../../../lib/format';
import { CABINET_LINKS } from '../../sections';
import { TARIFFS } from '../../tariffs';
import { ButtonLink } from '../../ui/ButtonLink';
import { useAccount } from '../../useAccount';
import type { SentReceipt } from './types';

function readReceipt(state: unknown): SentReceipt | null {
  if (typeof state !== 'object' || state === null) return null;
  const name: unknown = Reflect.get(state, 'name');
  const budget: unknown = Reflect.get(state, 'budget');
  const tariff = TARIFFS.find((plan) => plan.code === Reflect.get(state, 'tariff'))?.code;
  return typeof name === 'string' && typeof budget === 'number' && tariff ? { name, budget, tariff } : null;
}

/** «Кампания отправлена на проверку». Opened right after submitting; without that state it returns to the list. */
export function CampaignSentPage() {
  const { t, lang } = useI18n();
  const titleId = useId();
  const location = useLocation();
  const { contact } = useAccount();
  const receipt = readReceipt(location.state);
  const back = listReturnTo(location.state, CABINET_LINKS.campaigns);
  if (!receipt) return <Navigate to={back} replace />;
  const amount = formatMoney(receipt.budget, lang);
  const email = contact ?? '';

  return (
    <div className="cmp-done">
      <section className="cab-card cmp-done__card" aria-labelledby={titleId}>
        <span className="cmp-done__icon" aria-hidden="true">
          <Icon name="check" size={30} strokeWidth={2.25} />
        </span>
        <h2 className="cab-h2" id={titleId}>
          {t('campaigns.sent.title')}
        </h2>
        <p className="cab-lead cmp-done__lead">{t('campaigns.sent.lead', { name: receipt.name, email })}</p>
        <dl className="cab-receipt cmp-done__receipt">
          <div>
            <dt>{t('campaigns.sent.name')}</dt>
            <dd>{receipt.name}</dd>
          </div>
          <div>
            <dt>{t('campaigns.sent.tariff')}</dt>
            <dd>{t(`cabinet.tariffs.${receipt.tariff}.name`)}</dd>
          </div>
          <div>
            <dt>{t('campaigns.sent.toPay')}</dt>
            <dd>{amount}</dd>
          </div>
        </dl>
        <Timeline
          className="cmp-done__timeline"
          stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
          items={[
            { key: 'review', title: t('campaigns.row.timeline.review'), text: t('campaigns.sent.timeline.reviewText'), state: 'current' },
            { key: 'payment', title: t('campaigns.row.timeline.payment'), text: t('campaigns.sent.timeline.paymentText', { amount, email }), state: 'todo' },
            { key: 'launch', title: t('campaigns.row.timeline.launch'), text: t('campaigns.sent.timeline.launchText'), state: 'todo' },
          ]}
        />
        <div className="cmp-done__ctas">
          <ButtonLink to={back} variant="primary" size="lg">
            {t('campaigns.sent.toList')}
          </ButtonLink>
          <ButtonLink to={CABINET_LINKS.newCampaign} variant="ghost" size="lg" iconLeft="plus">
            {t('campaigns.sent.createAnother')}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
