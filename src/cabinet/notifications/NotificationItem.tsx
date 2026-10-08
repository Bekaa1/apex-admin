import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx, Icon, type IconName } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatDayMonth, formatTime } from '../../lib/format';
import type { NotificationTone, NotificationView } from './model';
import styles from './Notifications.module.css';

const TONE_ICON: Record<NotificationTone, IconName> = { info: 'info', success: 'check-circle', warning: 'alert-triangle', error: 'alert-circle' };

/** One notification; it leads to its campaign when it has one, and opening it marks it read. */
export function NotificationItem({ item, onOpen }: { item: NotificationView; onOpen: () => void }) {
  const { t, lang } = useI18n();
  const className = cx(styles.item, item.unread && styles.unread);
  const content: ReactNode = (
    <>
      <span className={cx(styles.tone, styles[item.tone])} aria-hidden="true">
        <Icon name={TONE_ICON[item.tone]} size={18} />
      </span>
      <span className={styles.text}>
        <span className={styles.itemTitle}>{item.title}</span>
        {item.body ? <span className={styles.itemBody}>{item.body}</span> : null}
        {item.rules.length ? (
          <span className={styles.itemBody}>{t('cabinet.notifications.reasons', { list: item.rules.map((code) => t(`campaigns.rules.${code}`)).join('; ') })}</span>
        ) : null}
        <time className={styles.time} dateTime={item.createdAt}>
          {formatDayMonth(item.createdAt, lang)}, {formatTime(item.createdAt, lang)}
        </time>
      </span>
      {item.unread ? <span className={styles.unreadDot} role="img" aria-label={t('cabinet.notifications.unread')} /> : null}
    </>
  );
  return item.link ? (
    <Link to={item.link} className={className} onClick={onOpen}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onOpen}>
      {content}
    </button>
  );
}
