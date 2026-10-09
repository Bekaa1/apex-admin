import '../campaigns.css';
import { useId } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';
import { Icon, Timeline } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatPrice } from '../../../lib/format';
import { CABINET_LINKS } from '../../sections';
import { ButtonLink } from '../../ui/ButtonLink';
import { PaymentNote, PaymentRows, PayInKaspiButton } from '../payment/KaspiPayment';
import { canPay, useInvoiceToPay } from '../payment/useInvoiceToPay';
import { readTopUpReceipt } from './receipt';

/** «Счёт выставлен». Opened right after the invoice is created; without that state it returns to the campaign. */
export function TopUpSentPage() {
  const { t, lang } = useI18n();
  const titleId = useId();
  const { campaignId } = useParams();
  const location = useLocation();
  const receipt = readTopUpReceipt(location.state);
  const payment = useInvoiceToPay(receipt && campaignId ? campaignId : null, receipt?.amount ?? 0);
  if (!campaignId) return <Navigate to={CABINET_LINKS.campaigns} replace />;
  if (!receipt) return <Navigate to={CABINET_LINKS.campaign(campaignId)} replace />;
  const amount = formatMoney(receipt.amount, lang);

  return (
    <div className="cmp-done">
      <section className="cab-card cmp-done__card" aria-labelledby={titleId}>
        <span className="cmp-done__icon" aria-hidden="true">
          <Icon name="check" size={30} strokeWidth={2.25} />
        </span>
        <h2 className="cab-h2" id={titleId}>
          {t('campaigns.topUp.sent.title')}
        </h2>
        <p className="cab-lead cmp-done__lead">{t('campaigns.topUp.sent.lead', { amount, email: receipt.email, name: receipt.name })}</p>
        <dl className="cab-receipt cmp-done__receipt">
          <div>
            <dt>{t('campaigns.sent.name')}</dt>
            <dd>{receipt.name}</dd>
          </div>
          {receipt.tariff ? (
            <div>
              <dt>{t('campaigns.sent.tariff')}</dt>
              <dd>{t(`cabinet.tariffs.${receipt.tariff}.name`)}</dd>
            </div>
          ) : null}
          {receipt.pricePerPlay === null ? null : (
            <div>
              <dt>{t('cabinet.tariffs.pricePerPlay')}</dt>
              <dd>{formatPrice(receipt.pricePerPlay, lang)}</dd>
            </div>
          )}
          <div>
            <dt>{t('campaigns.sent.toPay')}</dt>
            <dd>{amount}</dd>
          </div>
          <PaymentRows invoice={payment.status === 'ready' ? payment.invoice : null} />
        </dl>
        <PaymentNote state={payment} />
        <Timeline
          className="cmp-done__timeline"
          stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
          items={[
            { key: 'payment', title: t('campaigns.topUp.next.payment'), text: t('campaigns.topUp.sent.paymentText', { email: receipt.email }), state: 'current' },
            { key: 'resume', title: t('campaigns.row.timeline.resume'), text: t('campaigns.topUp.sent.resumeText'), state: 'todo' },
          ]}
        />
        <div className="cmp-done__ctas">
          {canPay(payment) ? <PayInKaspiButton /> : null}
          <ButtonLink to={CABINET_LINKS.campaign(campaignId)} variant={canPay(payment) ? 'secondary' : 'primary'} size="lg">
            {t('campaigns.topUp.back')}
          </ButtonLink>
          <ButtonLink to={CABINET_LINKS.campaigns} variant="ghost" size="lg">
            {t('campaigns.sent.toList')}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
