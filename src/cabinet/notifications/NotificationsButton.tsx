import { useLocation } from 'react-router';
import { cx, Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { usePopover } from '../ui/usePopover';
import styles from './Notifications.module.css';
import { NotificationsPanel } from './NotificationsPanel';
import { useLiveNotifications, useUnreadNotifications } from './useNotifications';

function NotificationsPopover({ unread }: { unread: number }) {
  const { t, lang } = useI18n();
  const { open, close, rootRef, panelId, buttonProps } = usePopover();
  const label = unread ? t('cabinet.notifications.unreadLabel', { count: formatNumber(unread, lang) }) : t('cabinet.notifications.title');
  return (
    <div ref={rootRef} className={styles.root}>
      <button type="button" className={cx('ax-iconbtn', open && styles.open)} aria-label={label} title={label} aria-haspopup="dialog" {...buttonProps}>
        <Icon name="bell" />
        {unread ? <span className={styles.dot} aria-hidden="true" /> : null}
      </button>
      {open ? <NotificationsPanel id={panelId} unread={unread} onClose={close} /> : null}
    </div>
  );
}

/** The bell of the top bar: a red dot while something is unread, the list in a drop-down panel. */
export function NotificationsButton() {
  const { pathname } = useLocation();
  const unread = useUnreadNotifications();
  useLiveNotifications();
  // A new page closes the panel; the subscription above stays.
  return <NotificationsPopover key={pathname} unread={unread} />;
}
