import { skipToken, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useAuthSession } from '../../../auth/useAuthSession';
import { parseDemoVariant, type DemoVariant } from '../../demo';
import { queryKeys } from '../../queryKeys';
import { editCampaign, fetchCampaignPrefill, fetchWizardCatalog, submitCampaign, uploadCampaignMedia } from '../api';
import { campaignAbilities } from '../model';
import type { Moderation } from '../types';
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
  | { status: 'ready'; userId: string; catalog: WizardCatalog; prefill: CampaignForm | null; edited: EditedCampaign | null; moderation: Moderation | null; api: WizardApi };

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
        ? { id: source.campaignId, running: !returned, rejected: returned, launched: !returned, budget: 3_000_000, left: returned ? 3_000_000 : 1_250_000, canTopUp: !returned }
        : null,
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
    // An edit must start from the campaign as it is now, never from a stale copy.
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
  if (sourceId !== null && !row) return { status: 'missing' };
  if (source.kind === 'edit' && row && !campaignAbilities({ status: row.status, tariff_can_extend: null }).canEdit) return { status: 'locked' };
  return {
    status: 'ready',
    userId,
    catalog: catalog.data,
    prefill: row ? formFromPrefill(row, catalog.data) : null,
    edited: source.kind === 'edit' && row ? editedCampaign(source.campaignId, row) : null,
    moderation: source.kind === 'edit' && row?.status === 'rejected' ? row.moderation : null,
    api: {
      uploadMedia: (file, fileName, onProgress, signal) => uploadCampaignMedia(userId, file, fileName, onProgress, signal),
      submit: submitCampaign,
      edit: editCampaign,
    },
  };
}
