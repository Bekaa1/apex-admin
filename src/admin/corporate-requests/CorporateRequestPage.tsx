import { useLocation, useParams } from 'react-router';
import { Alert, Badge, Button } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { OverviewReadError } from '../overview/api';
import { overviewDate } from '../overview/model';
import { OverviewLoading } from '../overview/OverviewState';
import { corporateReturnTo, isRequestId, requestText } from './model';
import { useCorporateRequest } from './useCorporateRequest';
import styles from './CorporateRequestPage.module.css';

export function CorporateRequestPage() {
  const { id } = useParams();
  const location = useLocation();
  const { t, lang } = useI18n();
  const query = useCorporateRequest(id);
  const returnTo = corporateReturnTo(location.state);
  const row = query.data?.value;
  const unknown = t('adminCorporate.notSpecified');
  const errorKind = query.error instanceof OverviewReadError ? query.error.kind : 'unavailable';
  return <section className={styles.page} aria-busy={query.isFetching}>
    <div><Button href={returnTo} variant="ghost" size="md" iconLeft="arrow-left">{t(returnTo === '/admin' ? 'adminCorporate.backOverview' : 'adminCorporate.backList')}</Button></div>
    <header className={styles.heading}><h1>{t('adminCorporate.title')}</h1><p className={styles.muted}>{t('adminCorporate.readOnly')}</p></header>
    {!isRequestId(id) ? <Alert tone="danger" title={t('adminCorporate.invalidId.title')}>{t('adminCorporate.invalidId.body')}</Alert>
      : query.isPending ? <OverviewLoading />
      : query.isError ? <Alert tone="danger" title={t(errorKind === 'denied' ? 'adminCorporate.deniedTitle' : 'adminCorporate.errorTitle')}
        action={<Button variant="secondary" size="md" loading={query.isFetching} onClick={() => { void query.refetch(); }}>{t('cabinet.retry')}</Button>}>
        {t(`adminCorporate.errors.${errorKind}`)}
      </Alert>
      : !row ? <Alert title={t('adminCorporate.notFound.title')}>{t('adminCorporate.notFound.body')}</Alert>
      : <>
        <div className={styles.panel}>
          <dl className={styles.fields}>
            <div className={styles.full}><dt>{t('adminCorporate.fields.company')}</dt><dd>{requestText(row.company, unknown)}</dd></div>
            <div><dt>{t('adminCorporate.fields.contactName')}</dt><dd>{requestText(row.contact_name, unknown)}</dd></div>
            <div><dt>{t('adminCorporate.fields.status')}</dt><dd><Badge className={styles.status}>{requestText(row.status, unknown)}</Badge></dd></div>
            <div><dt>{t('adminCorporate.fields.phone')}</dt><dd>{requestText(row.phone, unknown)}</dd></div>
            <div><dt>{t('adminCorporate.fields.email')}</dt><dd>{requestText(row.email, unknown)}</dd></div>
            <div><dt>{t('adminCorporate.fields.createdAt')}</dt><dd>{overviewDate(row.created_at, lang, unknown)}</dd></div>
            <div><dt>{t('adminCorporate.fields.updatedAt')}</dt><dd>{overviewDate(row.updated_at, lang, unknown)}</dd></div>
            <div className={styles.full}><dt>{t('adminCorporate.fields.userId')}</dt><dd>{requestText(row.user_id, t('adminCorporate.noAccount'))}</dd></div>
            <div className={styles.full}><dt>{t('adminCorporate.fields.id')}</dt><dd>{row.id}</dd></div>
          </dl>
          <p className={styles.muted}>{t('adminCorporate.timezone')}</p>
        </div>
        <section className={styles.panel}><h2>{t('adminCorporate.fields.message')}</h2><p className={styles.multiline}>{requestText(row.message, t('adminCorporate.noMessage'))}</p></section>
        <section className={styles.panel}><h2>{t('adminCorporate.fields.managerComment')}</h2><p className={styles.multiline}>{requestText(row.manager_comment, t('adminCorporate.noComment'))}</p></section>
      </>}
  </section>;
}
