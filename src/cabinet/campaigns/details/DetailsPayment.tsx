import { Alert } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney } from '../../../lib/format';
import { PayInKaspiButton } from '../payment/KaspiPayment';
import type { CampaignDetails } from './types';

/** An unpaid invoice with «Оплатить в Kaspi». Before the launch paying is the main action; later the head keeps «Пополнить». */
export function DetailsPayment({ details }: { details: CampaignDetails }) {
  const { t, lang } = useI18n();
  const { invoice, stage } = details;
  if (!invoice || invoice.paid || stage.kind === 'rejected' || stage.kind === 'finished') return null;
  const beforeLaunch = stage.kind === 'review' || stage.kind === 'awaitingPayment';
  const amount = formatMoney(invoice.amount, lang);
  return (
    <Alert
      tone="info"
      title={t('campaigns.payment.awaitingTitle', { number: String(invoice.number), amount })}
      action={<PayInKaspiButton variant={beforeLaunch ? 'primary' : 'secondary'} size="md" />}
    >
      {t('campaigns.payment.note', { amount })}
    </Alert>
  );
}
