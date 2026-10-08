import { useEffect, useId, useRef } from 'react';
import { Button, Icon, Skeleton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { LoadError } from '../ui/LoadError';
import styles from './Notifications.module.css';
import { NotificationItem } from './NotificationItem';
import { useMarkNotificationsRead, useNotificationFeed } from './useNotifications';

interface NotificationsPanelProps {
  id: string;
  unread: number;
  onClose: () => void;
}

function FeedBody({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const feed = useNotificationFeed();
  const { mark } = useMarkNotificationsRead();

  if (feed.status === 'loading') {
    return (
      <div className={styles.loading} role="status" aria-label={t('cabinet.notifications.loading')}>
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} height={64} />
        ))}
      </div>
    );
  }
  if (feed.status === 'error') {
    return (
      <div className={styles.state}>
        <LoadError title={t('cabinet.notifications.errorTitle')} onRetry={feed.retry}>
          {t('cabinet.notifications.errorText')}
        </LoadError>
      </div>
    );
  }
  if (!feed.items.length) {
    return (
      <div className={styles.empty}>
        <span className="cab-tile cab-tile--brand cab-tile--md" aria-hidden="true">
          <Icon name="bell" size={22} />
        </span>
        <p className={styles.emptyTitle}>{t('cabinet.notifications.emptyTitle')}</p>
        <p className={styles.muted}>{t('cabinet.notifications.emptyText')}</p>
      </div>
    );
  }
  return (
    <>
      <ul className={styles.list}>
        {feed.items.map((item) => (
          <li key={item.id}>
            <NotificationItem
              item={item}
              onOpen={() => {
                if (item.unread) mark([item.id]);
                if (item.link) onClose();
              }}
            />
          </li>
        ))}
      </ul>
      {feed.loadMore ? (
        <Button variant="ghost" size="md" fullWidth disabled={feed.loadingMore} onClick={feed.loadMore}>
          {t('cabinet.notifications.more')}
        </Button>
      ) : null}
    </>
  );
}

/** Drop-down list of the cabinet notifications, newest first. */
export function NotificationsPanel({ id, unread, onClose }: NotificationsPanelProps) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { mark, pending } = useMarkNotificationsRead();

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div ref={panelRef} id={id} className={styles.panel} role="dialog" aria-labelledby={titleId} tabIndex={-1}>
      <div className={styles.head}>
        <h2 className={styles.title} id={titleId}>
          {t('cabinet.notifications.title')}
        </h2>
        {unread ? (
          <Button variant="ghost" size="md" disabled={pending} onClick={() => mark()}>
            {t('cabinet.notifications.readAll')}
          </Button>
        ) : null}
      </div>
      <div className={styles.body}>
        <FeedBody onClose={onClose} />
      </div>
    </div>
  );
}
