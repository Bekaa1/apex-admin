import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, Button } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber } from '../../../lib/format';
import { OverviewLoading } from '../../overview/OverviewState';
import { CampaignReadError, type CampaignErrorKind } from '../api';
import { PAGE_SIZE } from '../model';
import styles from './CampaignDetail.module.css';

export function DetailFailure({ kind, retry, pending = false }: { kind: CampaignErrorKind | 'notVisible'; retry: () => void; pending?: boolean }) {
  const { t } = useI18n();
  return <Alert tone="danger" title={t(kind === 'denied' ? 'adminCampaignDetail.denied' : 'adminCampaignDetail.error')}
    action={<Button variant="secondary" size="md" loading={pending} onClick={retry}>{t('cabinet.retry')}</Button>}>
    {t(`adminCampaignDetail.errors.${kind}`)}
  </Alert>;
}
export function DetailQuery<T>({ query, children }: { query: UseQueryResult<T, Error>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <OverviewLoading />;
  if (query.isError) return <DetailFailure kind={query.error instanceof CampaignReadError ? query.error.kind : 'unavailable'} pending={query.isFetching} retry={() => { void query.refetch(); }} />;
  return <>{children(query.data)}</>;
}
export function DetailField({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return <div className={full ? styles.full : undefined}><dt>{label}</dt><dd>{children}</dd></div>;
}
export function RelatedNavigation({ page, count, pending, onPage, label }: { page: number; count: number | null; pending: boolean; onPage: (page: number) => void; label: string }) {
  const { t, lang } = useI18n();
  return <nav className={styles.actions} aria-label={label}>
    <Button variant="secondary" size="md" disabled={page <= 1 || pending} onClick={() => onPage(page - 1)}>{t('adminCampaigns.previous')}</Button>
    <p className={styles.muted}>{count === null ? t('adminCampaigns.page', { page, size: PAGE_SIZE }) : t('adminCampaignDetail.page', { page, count: formatNumber(count, lang) })}</p>
    <Button variant="secondary" size="md" disabled={count === null || page * PAGE_SIZE >= count || pending} onClick={() => onPage(page + 1)}>{t('adminCampaigns.next')}</Button>
  </nav>;
}
