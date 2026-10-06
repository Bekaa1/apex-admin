import { skipToken, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useAuthSession } from '../../../auth/useAuthSession';
import { parseDemoVariant, type DemoVariant } from '../../demo';
import { queryKeys } from '../../queryKeys';
import { fetchCampaignPrefill, fetchWizardCatalog, uploadCampaignMedia } from '../api';
import type { Moderation } from '../types';
import { DEMO_MODERATION, demoCatalog, demoReturnedForm, demoWizardApi } from './demo';
import { formFromPrefill } from './summary';
import type { CampaignForm, WizardApi, WizardCatalog } from './types';

/** Where the form starts: empty, a copy of a campaign («Повторить») or a returned campaign («Исправить»). */
export type WizardSource = { kind: 'new' } | { kind: 'copy'; campaignId: string } | { kind: 'fix'; campaignId: string };

export type WizardData =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'missing' }
  | { status: 'ready'; userId: string; catalog: WizardCatalog; prefill: CampaignForm | null; moderation: Moderation | null; api: WizardApi };

const CATALOG_STALE_MS = 5 * 60_000;

function demoData(variant: DemoVariant, source: WizardSource): WizardData {
  if (variant === 'loading') return { status: 'loading' };
  if (variant === 'error') return { status: 'error', retry: () => window.location.reload() };
  const returned = source.kind === 'fix';
  return {
    status: 'ready',
    userId: 'demo',
    catalog: demoCatalog(),
    prefill: source.kind === 'new' ? null : demoReturnedForm(),
    moderation: returned ? DEMO_MODERATION : null,
    api: demoWizardApi(),
  };
}

export function useWizardData(source: WizardSource): WizardData {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV ? parseDemoVariant(params.get('demo')) : null;
  const sourceId = source.kind === 'new' ? null : source.campaignId;

  const catalog = useQuery({
    queryKey: queryKeys.storeCatalog(userId),
    queryFn: userId && !demo ? ({ signal }) => fetchWizardCatalog(signal) : skipToken,
    staleTime: CATALOG_STALE_MS,
  });
  const prefill = useQuery({
    queryKey: queryKeys.campaignPrefill(userId, sourceId),
    queryFn: userId && sourceId && !demo ? ({ signal }) => fetchCampaignPrefill(userId, sourceId, signal) : skipToken,
    // A campaign can be fixed only once; never reopen a stale copy of it.
    staleTime: 0,
  });

  if (demo) return demoData(demo, source);
  const failed = catalog.isError || (sourceId !== null && prefill.isError);
  const busy = catalog.isFetching || prefill.isFetching;
  if (!userId || catalog.isPending || (sourceId !== null && prefill.isPending) || (failed && busy)) return { status: 'loading' };
  if (failed) {
    return {
      status: 'error',
      retry: () => {
        void catalog.refetch();
        if (sourceId !== null) void prefill.refetch();
      },
    };
  }
  const row = prefill.data ?? null;
  if (sourceId !== null && (!row || (source.kind === 'fix' && row.status !== 'rejected'))) return { status: 'missing' };
  return {
    status: 'ready',
    userId,
    catalog: catalog.data,
    prefill: row ? formFromPrefill(row, catalog.data) : null,
    moderation: row?.moderation ?? null,
    // No `submit` until the backend adds `submit_campaign`: the wizard keeps the button off.
    api: { uploadMedia: (file, fileName, onProgress, signal) => uploadCampaignMedia(userId, file, fileName, onProgress, signal) },
  };
}
