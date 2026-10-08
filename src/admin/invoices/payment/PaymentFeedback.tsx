import { Alert, Button } from '../../../design-system';
import { useSignOut } from '../../../auth/useSignOut';
import { useI18n } from '../../../i18n/i18n';
import type { PaymentState } from './controller';
import styles from '../details/InvoiceDetail.module.css';

export function PaymentFeedback({ state, onRefresh }: { state: PaymentState; onRefresh: () => void }) {
  const { t } = useI18n();
  const signOut = useSignOut();
  return <div className={styles.feedback} aria-live="polite">
    {state.verified ? <Alert tone="success">{t('adminInvoiceDetail.success')}</Alert> : null}
    {state.issue ? <Alert tone="danger">{t(`adminInvoiceDetail.errors.${state.issue}`)}</Alert> : null}
    {state.busy ? <p role="status">{t('adminInvoiceDetail.processing')}</p> : null}
    {state.needsRefresh && !state.verified && state.issue !== 'not_authenticated' && state.issue !== 'forbidden'
      ? <div><Button size="md" variant="secondary" loading={state.busy} onClick={onRefresh}>{t('adminInvoiceDetail.checkState')}</Button></div> : null}
    {state.issue === 'not_authenticated' ? <div><Button size="md" loading={signOut.pending} onClick={() => { void signOut.signOut(); }}>{t('adminInvoiceDetail.login')}</Button></div> : null}
    {signOut.failed ? <Alert tone="danger">{t('adminInvoiceDetail.signOutFailed')}</Alert> : null}
  </div>;
}
