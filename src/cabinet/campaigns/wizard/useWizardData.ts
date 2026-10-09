import { skipToken, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useAuthSession } from '../../../auth/useAuthSession';
import { campaignAbilities, type Moderation } from '../../campaignStage';
import { parseDemoVariant, type DemoVariant } from '../../demo';
import { queryKeys } from '../../queryKeys';
import { useTariffTerms } from '../../useTariffTerms';
import { editCampaign, fetchCampaignPrefill, fetchStoreCatalog, fetchStorePlans, submitCampaign, uploadCampaignMedia } from '../api';
import { DEMO_MODERATION, demoCatalog, demoReturnedForm, demoWizardApi } from './demo';
import { formFromPrefill } from './summary';
import type { CampaignForm, CampaignPrefill, EditedCampaign, WizardApi, WizardCatalog } from './types';

/** Where the form starts: empty, a copy of a campaign («Повторить») or the campaign itself («Редактировать», «Исправить»). */
export type WizardSource = { kind: 'new' } | { kind: 'copy'; campaignId: string } | { kind: 'edit'; campaignId: string };

export type WizardData =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'missing' }
  /** The campaign exists but `edit_campaign` doesn't accept its status. */
  | { status: 'locked' }
  | {
      status: 'ready';
      userId: string;
      catalog: WizardCatalog;
      prefill: CampaignForm | null;
      edited: EditedCampaign | null;
      moderation: Moderation | null;
      api: WizardApi;
      /** Reloads the plans' terms after the server answered `tariff_changed`. */
      refreshTariffs: () => void;
    };

const CATALOG_STALE_MS = 5 * 60_000;

function editedCampaign(id: string, row: CampaignPrefill): EditedCampaign {
  const budget = row.budget ?? 0;
  return {
    id,
    running: row.status === 'active',
    rejected: row.status === 'rejected',
    launched: row.launched,
    budget,
    left: Math.max(budget - (row.spent ?? 0), 0),
    canTopUp: campaignAbilities({ status: row.status, tariff_can_extend: row.tariffSold }).canTopUp,
    hasZones: row.tariffZones,
  };
}

function demoData(variant: DemoVariant, source: WizardSource): WizardData {
  if (variant === 'loading') return { status: 'loading' };
  if (variant === 'error') return { status: 'error', retry: () => window.location.reload() };
  const prefill = source.kind === 'new' ? null : demoReturnedForm();
  // ?demo=new opens an edit of a running campaign, ?demo=active the returned one.
  const returned = source.kind === 'edit' && variant === 'active';
  return {
    status: 'ready',
    userId: 'demo',
    catalog: demoCatalog(),
    prefill,
    edited:
      source.kind === 'edit'
        ? {
            id: source.campaignId,
            running: !returned,
            rejected: returned,
            launched: !returned,
            budget: 3_000_000,
            left: returned ? 3_000_000 : 1_250_000,
            canTopUp: !returned,
            hasZones: true,
          }
        : null,
    moderation: returned ? DEMO_MODERATION : null,
    api: demoWizardApi(),
    refreshTariffs: () => undefined,
  };
}

export function useWizardData(source: WizardSource): WizardData {
  const { session } = useAuthSession();
  const userId = session?.user.id;
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV ? parseDemoVariant(params.get('demo')) : null;
  const sourceId = source.kind === 'new' ? null : source.campaignId;

  const tariffs = useTariffTerms();
  const catalog = useQuery({
    queryKey: queryKeys.storeCatalog(userId),
    queryFn: userId && !demo ? ({ signal }) => fetchStoreCatalog(signal) : skipToken,
    staleTime: CATALOG_STALE_MS,
  });
  const prefill = useQuery({
    queryKey: queryKeys.campaignPrefill(userId, sourceId),
    queryFn: userId && sourceId && !demo ? ({ signal }) => fetchCampaignPrefill(userId, sourceId, signal) : skipToken,
    // An edit must start from the campaign as it is now, never from a stale copy.
    staleTime: 0,
  });

  if (demo) return demoData(demo, source);
  const failed = catalog.isError || (sourceId !== null && prefill.isError) || tariffs.status === 'error';
  const busy = catalog.isFetching || prefill.isFetching;
  if (!userId || catalog.isPending || (sourceId !== null && prefill.isPending) || tariffs.status === 'loading' || (failed && busy)) return { status: 'loading' };
  if (failed || tariffs.status !== 'ready') {
    return {
      status: 'error',
      retry: () => {
        void catalog.refetch();
        if (sourceId !== null) void prefill.refetch();
        if (tariffs.status === 'error') tariffs.retry();
      },
    };
  }
  const row = prefill.data ?? null;
  if (sourceId !== null && !row) return { status: 'missing' };
  if (source.kind === 'edit' && row && !campaignAbilities({ status: row.status, tariff_can_extend: null }).canEdit) return { status: 'locked' };
  return {
    status: 'ready',
    userId,
    catalog: { ...catalog.data, tariffs: tariffs.terms },
    prefill: row ? formFromPrefill(row, catalog.data) : null,
    edited: source.kind === 'edit' && row ? editedCampaign(source.campaignId, row) : null,
    moderation: source.kind === 'edit' && row?.status === 'rejected' ? row.moderation : null,
    api: {
      uploadMedia: (file, fileName, onProgress, signal) => uploadCampaignMedia(userId, file, fileName, onProgress, signal),
      submit: submitCampaign,
      edit: editCampaign,
      storePlans: fetchStorePlans,
    },
    refreshTariffs: () => void tariffs.refetch(),
  };
}
