import { useId, type RefObject } from 'react';
import { Button, Icon, IconButton } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import type { StoreInsight } from './types';
import styles from './Analytics.module.css';

export function CampaignPreview({ dialogRef, store }: { dialogRef: RefObject<HTMLDialogElement | null>; store: StoreInsight }) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
    >
      <div className={styles.dialogContent}>
        <div className={styles.dialogHeader}>
          <span className={styles.storeIcon}><Icon name="megaphone" size={24} /></span>
          <IconButton icon="x" label={t('analytics.launch.close')} variant="ghost" onClick={() => dialogRef.current?.close()} />
        </div>
        <h2 id={titleId}>{t('analytics.launch.title')}</h2>
        <p id={descriptionId}>{t('analytics.launch.description')}</p>
        <div className={styles.selectedStore}>
          <Icon name="store" size={24} />
          <div><strong>{store.name}</strong><p>{[store.city, store.address].filter(Boolean).join(' · ') || t('analytics.noAddress')}</p></div>
        </div>
        <p className={styles.launchNote}>{t('analytics.launch.unavailable')}</p>
        <form method="dialog"><Button type="submit" fullWidth size="md">{t('analytics.launch.done')}</Button></form>
      </div>
    </dialog>
  );
}
