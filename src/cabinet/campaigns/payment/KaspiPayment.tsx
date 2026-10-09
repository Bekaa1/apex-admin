import { Badge, Button, Icon, type ButtonVariant } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney } from '../../../lib/format';
import { LoadError } from '../../ui/LoadError';
import { KASPI_PAY_URL, type InvoiceToPay } from './kaspi';
import type { InvoiceToPayState } from './useInvoiceToPay';

/** Opens Kaspi in a new tab: this tab keeps the campaign and shows the status when the advertiser comes back. */
export function PayInKaspiButton({ variant = 'primary', size = 'lg' }: { variant?: ButtonVariant; size?: 'md' | 'lg' }) {
  const { t } = useI18n();
  return (
    <Button href={KASPI_PAY_URL} target="_blank" rel="noopener noreferrer" variant={variant} size={size} iconRight="arrow-up-right" aria-label={t('campaigns.payment.payNewTab')}>
      {t('campaigns.payment.pay')}
    </Button>
  );
}

export function PaymentStatus({ paid }: { paid: boolean }) {
  const { t } = useI18n();
  return (
    <Badge tone={paid ? 'success' : 'warning'} dot>
      {t(paid ? 'campaigns.payment.paid' : 'campaigns.payment.awaiting')}
    </Badge>
  );
}

/** «Счёт № 1042» and «Оплата: Ждём оплату» rows inside a receipt's `<dl>`. */
export function PaymentRows({ invoice }: { invoice: InvoiceToPay | null }) {
  const { t } = useI18n();
  if (!invoice) return null;
  return (
    <>
      <div>
        <dt>{t('campaigns.payment.invoice')}</dt>
        <dd>{t('campaigns.payment.number', { number: String(invoice.number) })}</dd>
      </div>
      <div>
        <dt>{t('campaigns.payment.status')}</dt>
        <dd>
          <PaymentStatus paid={invoice.paid} />
        </dd>
      </div>
    </>
  );
}

/** Under the receipt of «Отправлено» and «Счёт выставлен»: how to pay, or why the status is unknown. */
export function PaymentNote({ state }: { state: InvoiceToPayState }) {
  const { t, lang } = useI18n();
  if (state.status === 'error') {
    return (
      <div className="cmp-done__note">
        <LoadError title={t('campaigns.payment.loadError')} onRetry={state.retry}>
          {t('campaigns.payment.loadErrorText')}
        </LoadError>
      </div>
    );
  }
  if (state.status !== 'ready' || !state.invoice || state.invoice.paid) return null;
  return (
    <p className="cab-note cmp-done__note">
      <Icon name="info" size={18} />
      {t('campaigns.payment.note', { amount: formatMoney(state.invoice.amount, lang) })}
    </p>
  );
}
