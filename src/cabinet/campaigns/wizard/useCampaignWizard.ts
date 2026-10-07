import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { queryKeys } from '../../queryKeys';
import { CABINET_LINKS } from '../../sections';
import { CampaignRpcError } from '../api';
import { campaignChanges } from './changes';
import { clearForm, saveForm } from './formStorage';
import { wizardReducer } from './reducer';
import { nextStep, prevStep, skipsZones, stepFromParam, stepParam } from './steps';
import { selectedZones } from './summary';
import type { CampaignEdit, CampaignForm, CampaignSubmission, SentReceipt, StepId, WizardApi, WizardCatalog, WizardFlow, WizardMode } from './types';
import { useMediaUpload } from './useMediaUpload';
import { firstInvalidStep, isStepValid, reachableStep, validateStep } from './validation';

export interface WizardOptions {
  userId: string;
  initial: CampaignForm;
  catalog: WizardCatalog;
  mode: WizardMode;
  storageKey: string;
  api: WizardApi;
}

/** The content an edit sends; null while the video isn't ready. The server needs the video's length and size too. */
export function toEdit(form: CampaignForm, catalog: WizardCatalog): CampaignEdit | null {
  const { video, cover } = form;
  if (video.status !== 'ready' || !video.meta) return null;
  const { durationSec, width, height, sizeBytes } = video.meta;
  if (durationSec === null || width === null || height === null || sizeBytes === null) return null;
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    video: { url: video.url, fileName: video.fileName, durationSec, width, height, sizeBytes },
    cover: cover.status === 'ready' ? { url: cover.url, fileName: cover.fileName } : null,
    storeIds: form.storeIds,
    zoneIds: skipsZones(form.tariff) ? [] : selectedZones(form, catalog).map((zone) => zone.id),
  };
}

/** What a new campaign sends; null while something required is missing. */
export function toSubmission(form: CampaignForm, catalog: WizardCatalog): CampaignSubmission | null {
  const content = toEdit(form, catalog);
  if (!content || !form.tariff || form.budget === null) return null;
  return { ...content, tariffCode: form.tariff, budget: form.budget, requestId: form.requestId };
}

type Sent = { id: string; receipt: SentReceipt };

/** State and actions of the wizard. The step lives in the URL (?step=), the form in the reducer and the tab's sessionStorage. */
export function useCampaignWizard({ userId, initial, catalog, mode, storageKey, api }: WizardOptions) {
  const [state, dispatch] = useReducer(wizardReducer, initial, (form) => ({ form, attempted: [], attempts: 0 }));
  const { form } = state;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const media = useMediaUpload(api, dispatch);
  const flow: WizardFlow = mode.kind === 'edit' ? 'edit' : 'new';
  const original = mode.kind === 'edit' ? mode.original : null;

  useEffect(() => saveForm(storageKey, form), [storageKey, form]);

  const uploading = form.video.status === 'uploading' || form.cover.status === 'uploading';
  useEffect(() => {
    if (!uploading) return;
    const keep = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', keep);
    return () => window.removeEventListener('beforeunload', keep);
  }, [uploading]);

  const step = reachableStep(flow, stepFromParam(flow, params.get('step')), form, catalog, original);

  const goTo = (target: StepId) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', stepParam(flow, target));
      next.delete('copy');
      return next;
    });

  const submission = useMutation({
    mutationFn: async (): Promise<Sent> => {
      if (mode.kind === 'edit') {
        const content = toEdit(form, catalog);
        if (!content) throw new Error('The edited campaign has no ready video.');
        const changed = campaignChanges(mode.original, form, catalog).map((change) => change.field);
        const id = await api.edit(mode.campaign.id, content);
        return { id, receipt: { kind: 'edit', name: content.name, changed, paused: mode.campaign.running } };
      }
      const payload = toSubmission(form, catalog);
      if (!payload) throw new Error('The campaign is not complete.');
      const id = await api.submit(payload);
      return { id, receipt: { kind: 'new', name: payload.name, tariff: payload.tariffCode, budget: payload.budget } };
    },
    onSuccess: ({ id, receipt }) => {
      clearForm(storageKey);
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home(userId) });
      navigate(CABINET_LINKS.campaignSent(id), { replace: true, state: receipt });
    },
  });

  return {
    flow,
    form,
    original,
    dispatch,
    media,
    step,
    errors: state.attempted.includes(step) ? validateStep(step, form, catalog, original) : {},
    attempts: state.attempts,
    submitting: submission.isPending,
    /** Code of the server check that failed (`invalid_video`, `missing_email`…), `network` for anything else. */
    submitError: submission.error ? (submission.error instanceof CampaignRpcError ? submission.error.code : 'network') : null,
    goTo,
    next: () => {
      if (!isStepValid(step, form, catalog, original)) {
        dispatch({ type: 'attempt', steps: [step] });
        return;
      }
      const target = nextStep(flow, step, form.tariff);
      if (target) goTo(target);
    },
    back: () => {
      const target = prevStep(flow, step, form.tariff);
      if (target) goTo(target);
    },
    /** «Отменить изменения»: forget the draft of this tab. */
    discard: () => clearForm(storageKey),
    submit: () => {
      const invalid = firstInvalidStep(flow, form, catalog, original);
      const ready = flow === 'edit' ? toEdit(form, catalog) : toSubmission(form, catalog);
      if (invalid || !ready) {
        dispatch({ type: 'attempt', steps: [invalid ?? step] });
        // Navigating to the same step would let the router restore the old scroll over the focused error summary.
        if (invalid && invalid !== step) goTo(invalid);
        return;
      }
      submission.mutate();
    },
  };
}

export type CampaignWizardState = ReturnType<typeof useCampaignWizard>;
