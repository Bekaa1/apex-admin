import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '../../../auth/useAuthSession';
import type { CampaignStage } from '../../campaignStage';
import { parseDemoVariant } from '../../demo';
import { queryKeys } from '../../queryKeys';
import { CampaignRpcError, setCampaignPaused } from '../api';

type Command = 'pause' | 'resume';

export interface CampaignPause {
  /** A running campaign: «Поставить на паузу» in the «⋯» menu. */
  canPause: boolean;
  /** Paused by the advertiser: «Возобновить» instead of the main button. */
  canResume: boolean;
  /** Opens the confirmation; resuming needs none. */
  askPause: () => void;
  confirmOpen: boolean;
  closeConfirm: () => void;
  pause: () => void;
  resume: () => void;
  pending: boolean;
  /** The last resume went through: «Показы возобновлены». */
  resumed: boolean;
  /** i18n key of the last failure. */
  errorKey: string | null;
}

function errorKeyOf(error: Error, command: Command): string {
  if (error instanceof CampaignRpcError && (error.code === 'invalid_status' || error.code === 'not_found')) return `campaigns.pause.errors.${error.code}`;
  return `campaigns.pause.errors.${command}`;
}

/** Pause and resume of one campaign; the lists, the card and Home refresh after either. */
export function useCampaignPause(campaignId: string, stage: CampaignStage): CampaignPause {
  const userId = useAuthSession().session?.user.id;
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV ? parseDemoVariant(params.get('demo')) : null;
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (command: Command) => (demo ? Promise.resolve(command === 'pause' ? 'paused' : 'active') : setCampaignPaused(campaignId, command === 'pause')),
    onSuccess: (_status, command) => {
      if (command === 'pause') setConfirmOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
    },
  });
  return {
    canPause: stage.kind === 'active',
    canResume: stage.kind === 'paused' && stage.byAdvertiser,
    askPause: () => {
      mutation.reset();
      setConfirmOpen(true);
    },
    confirmOpen,
    closeConfirm: () => {
      setConfirmOpen(false);
      if (!mutation.isPending) mutation.reset();
    },
    pause: () => mutation.mutate('pause'),
    resume: () => mutation.mutate('resume'),
    pending: mutation.isPending,
    resumed: mutation.isSuccess && mutation.variables === 'resume',
    errorKey: mutation.error ? errorKeyOf(mutation.error, mutation.variables ?? 'pause') : null,
  };
}
