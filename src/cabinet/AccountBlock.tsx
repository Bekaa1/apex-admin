import { Avatar, Skeleton, cx } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { accountInitials, useAccount } from './useAccount';

export function AccountBlock() {
  const { t } = useI18n();
  const account = useAccount();
  return (
    <div className="cab-account">
      <Avatar initials={accountInitials(account)} />
      <div className="cab-account__text" aria-busy={account.status === 'loading'}>
        {account.status === 'loading' ? <Skeleton width="100%" /> : (
          <p className={cx('cab-account__name', !account.companyName && 'cab-account__name--empty')}>
            {account.status === 'error' ? t('cabinet.accountError') : account.companyName ?? t('cabinet.noCompany')}
          </p>
        )}
        {account.contact ? <p className="cab-account__email">{account.contact}</p> : null}
      </div>
    </div>
  );
}
