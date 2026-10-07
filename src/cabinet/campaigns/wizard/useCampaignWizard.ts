import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { listReturnTo } from '../../../navigation/returnTo';
import { queryKeys } from '../../queryKeys';
import { CABINET_LINKS } from '../../sections';
import { CampaignRpcError } from '../api';
import { clearForm, saveForm } from './formStorage';
import { wizardReducer } from './reducer';
import { nextStep, prevStep, skipsZones, stepFromParam, stepParam } from './steps';
import { selectedZones } from './summary';
import type { CampaignForm, CampaignSubmission, SentReceipt, StepId, WizardApi, WizardCatalog, WizardMode } from './types';
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

/** What the wizard sends; null while something required is missing. The server needs the video's length and size too. */
export function toSubmission(form: CampaignForm, catalog: WizardCatalog): CampaignSubmission | null {
  const { video, cover, tariff, budget } = form;
  if (video.status !== 'ready' || !video.meta || !tariff || budget === null) return null;
  const { durationSec, width, height, sizeBytes } = video.meta;
  if (durationSec === null || width === null || height === null || sizeBytes === null) return null;
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    tariffCode: tariff,
    video: { url: video.url, fileName: video.fileName, durationSec, width, height, sizeBytes },
    cover: cover.status === 'ready' ? { url: cover.url, fileName: cover.fileName } : null,
    storeIds: form.storeIds,
    zoneIds: skipsZones(tariff) ? [] : selectedZones(form, catalog).map((zone) => zone.id),
    budget,
    requestId: form.requestId,
  };
}

/** State and actions of the wizard. The step lives in the URL (?step=), the form in the reducer and the tab's sessionStorage. */
export function useCampaignWizard({ userId, initial, catalog, mode, storageKey, api }: WizardOptions) {
  const [state, dispatch] = useReducer(wizardReducer, initial, (form) => ({ form, attempted: [], attempts: 0 }));
  const { form } = state;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const media = useMediaUpload(api, dispatch);

  useEffect(() => saveForm(storageKey, form), [storageKey, form]);

  const uploading = form.video.status === 'uploading' || form.cover.status === 'uploading';
  useEffect(() => {
    if (!uploading) return;
    const keep = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', keep);
    return () => window.removeEventListener('beforeunload', keep);
  }, [uploading]);

  const step = reachableStep(stepFromParam(params.get('step')), form, catalog);

  const goTo = (target: StepId) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', stepParam(target));
      next.delete('copy');
      return next;
    }, { state: location.state });

  const submission = useMutation({
    mutationFn: (payload: CampaignSubmission) => api.submit(payload, mode),
    onSuccess: (campaignId, payload) => {
      clearForm(storageKey);
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home(userId) });
      const receipt: SentReceipt = { name: payload.name, tariff: payload.tariffCode, budget: payload.budget };
      navigate(CABINET_LINKS.campaignSent(campaignId), { replace: true, state: { ...receipt, returnTo: listReturnTo(location.state, CABINET_LINKS.campaigns) } });
    },
  });

  return {
    form,
    dispatch,
    media,
    step,
    errors: state.attempted.includes(step) ? validateStep(step, form, catalog) : {},
    attempts: state.attempts,
    /** «Исправить»: the plan and the budget stay as they were. */
    fixing: mode.kind === 'fix',
    submitting: submission.isPending,
    /** Code of the server check that failed (`invalid_video`, `missing_email`…), `network` for anything else. */
    submitError: submission.error ? (submission.error instanceof CampaignRpcError ? submission.error.code : 'network') : null,
    goTo,
    next: () => {
      if (!isStepValid(step, form, catalog)) {
        dispatch({ type: 'attempt', steps: [step] });
        return;
      }
      const target = nextStep(step, form.tariff);
      if (target) goTo(target);
    },
    back: () => {
      const target = prevStep(step, form.tariff);
      if (target) goTo(target);
    },
    submit: () => {
      const invalid = firstInvalidStep(form, catalog);
      const payload = toSubmission(form, catalog);
      if (invalid || !payload) {
        dispatch({ type: 'attempt', steps: [invalid ?? step] });
        // Navigating to the same step would let the router restore the old scroll over the focused error summary.
        if (invalid && invalid !== step) goTo(invalid);
        return;
      }
      submission.mutate(payload);
    },
  };
}

export type CampaignWizardState = ReturnType<typeof useCampaignWizard>;
