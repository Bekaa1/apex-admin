import { Button } from '../design-system';
import { useI18n } from '../i18n/i18n';
import styles from './AdminLayout.module.css';

export function AdminPlaceholder({ titleKey }: { titleKey: string }) {
  const { t } = useI18n();
  return <section className={styles.placeholder}><h1>{t(titleKey)}</h1><p>{t('adminShell.inDevelopment')}</p></section>;
}

export function AdminNotFound() {
  const { t } = useI18n();
  return <section className={styles.placeholder}>
    <h1>{t('adminShell.notFound.title')}</h1><p>{t('adminShell.notFound.body')}</p>
    <div><Button href="/admin" size="md">{t('adminShell.backOverview')}</Button></div>
  </section>;
}
