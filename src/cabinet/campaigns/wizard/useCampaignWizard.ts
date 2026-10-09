import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { queryKeys } from '../../queryKeys';
import { CABINET_LINKS } from '../../sections';
import { CampaignRpcError } from '../api';
import { campaignChanges } from './changes';
import { clearForm, saveForm } from './formStorage';
import { wizardReducer } from './reducer';
import { termsOf, type TariffTerms } from '../../tariffs';
import { nextStep, prevStep, stepFromParam, stepParam } from './steps';
import { selectedZones } from './summary';
import type { CampaignEdit, CampaignForm, CampaignSubmission, SentReceipt, StepId, WizardApi, WizardCatalog, WizardContext, WizardMode } from './types';
import { useMediaUpload } from './useMediaUpload';
import { firstInvalidStep, isStepValid, parseDailyLimit, reachableStep, validateStep } from './validation';

export interface WizardOptions {
  userId: string;
  initial: CampaignForm;
  catalog: WizardCatalog;
  mode: WizardMode;
  storageKey: string;
  api: WizardApi;
  /** The server said the plan's terms changed: reload them so the minimum and the version are current. */
  onTariffChanged: () => void;
}

/** The content an edit sends; null while the video isn't ready. The server needs the video's length and size too. */
export function toEdit(form: CampaignForm, ctx: WizardContext): CampaignEdit | null {
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
    zoneIds: ctx.zones === false ? [] : selectedZones(form, ctx.catalog).map((zone) => zone.id),
  };
}

/** What a new campaign sends with the plan's terms it shows; null while something is missing or the plan is off sale. */
export function toSubmission(form: CampaignForm, ctx: WizardContext): CampaignSubmission | null {
  const content = toEdit(form, ctx);
  const terms = termsOf(ctx.catalog.tariffs, form.tariff);
  const dailyLimit = parseDailyLimit(form.dailyLimit);
  if (!content || !terms || form.budget === null || dailyLimit === 'invalid') return null;
  return { ...content, tariffCode: terms.code, tariffVersion: terms.version, budget: form.budget, dailyLimit, requestId: form.requestId };
}

type Sent = { id: string; receipt: SentReceipt };

/** State and actions of the wizard. The step lives in the URL (?step=), the form in the reducer and the tab's sessionStorage. */
export function useCampaignWizard({ userId, initial, catalog, mode, storageKey, api, onTariffChanged }: WizardOptions) {
  const [state, dispatch] = useReducer(wizardReducer, initial, (form) => ({ form, attempted: [], attempts: 0 }));
  const { form } = state;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const media = useMediaUpload(api, dispatch);
  // The plan's terms the advertiser saw when the server answered `tariff_changed`, and the version they agreed to since.
  const [staleTerms, setStaleTerms] = useState<TariffTerms | null>(null);
  const [agreedVersion, setAgreedVersion] = useState<number | null>(null);
  const [termsAttempted, setTermsAttempted] = useState(false);

  const plan = termsOf(catalog.tariffs, form.tariff);
  const ctx: WizardContext = {
    flow: mode.kind === 'edit' ? 'edit' : 'new',
    catalog,
    zones: mode.kind === 'edit' ? mode.campaign.hasZones : (plan?.hasZones ?? null),
    original: mode.kind === 'edit' ? mode.original : null,
    resubmit: mode.kind === 'edit' && mode.campaign.rejected,
  };
  const termsChange = staleTerms && plan && plan.code === staleTerms.code && plan.version !== staleTerms.version ? { was: staleTerms, now: plan } : null;
  const termsAgreed = !termsChange || agreedVersion === termsChange.now.version;

  useEffect(() => saveForm(storageKey, form), [storageKey, form]);

  const uploading = form.video.status === 'uploading' || form.cover.status === 'uploading';
  useEffect(() => {
    if (!uploading) return;
    const keep = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', keep);
    return () => window.removeEventListener('beforeunload', keep);
  }, [uploading]);

  const step = reachableStep(stepFromParam(ctx.flow, params.get('step')), form, ctx);

  const goTo = (target: StepId) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', stepParam(ctx.flow, target));
      next.delete('copy');
      return next;
    });

  const submission = useMutation({
    // `shown` are the plan's terms the form showed; kept to tell what changed if the server refuses them.
    mutationFn: async (shown: TariffTerms | null): Promise<Sent> => {
      if (mode.kind === 'edit') {
        const content = toEdit(form, ctx);
        if (!content) throw new Error('The edited campaign has no ready video.');
        const changed = campaignChanges(mode.original, form, ctx).map((change) => change.field);
        const id = await api.edit(mode.campaign.id, content);
        return { id, receipt: { kind: 'edit', name: content.name, changed, paused: mode.campaign.running } };
      }
      const payload = toSubmission(form, ctx);
      if (!payload || !shown) throw new Error('The campaign is not complete.');
      const id = await api.submit(payload);
      return { id, receipt: { kind: 'new', name: payload.name, tariff: payload.tariffCode, budget: payload.budget, pricePerPlay: shown.pricePerPlay, dailyLimit: payload.dailyLimit } };
    },
    onSuccess: ({ id, receipt }) => {
      clearForm(storageKey);
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home(userId) });
      navigate(CABINET_LINKS.campaignSent(id), { replace: true, state: receipt });
    },
    onError: (error, shown) => {
      if (!(error instanceof CampaignRpcError) || error.code !== 'tariff_changed') return;
      setStaleTerms(shown);
      setTermsAttempted(false);
      onTariffChanged();
    },
  });

  return {
    flow: ctx.flow,
    ctx,
    form,
    original: ctx.original,
    dispatch,
    media,
    step,
    errors: state.attempted.includes(step) ? validateStep(step, form, ctx) : {},
    attempts: state.attempts,
    submitting: submission.isPending,
    /** Code of the server check that failed (`invalid_video`, `missing_email`…), `network` for anything else. */
    submitError: submission.error ? (submission.error instanceof CampaignRpcError ? submission.error.code : 'network') : null,
    /** The plan's terms changed after the advertiser saw them: what was and what is now. */
    termsChange,
    termsAgreed,
    /** A submit was tried without agreeing to the new terms. */
    termsError: Boolean(termsChange) && termsAttempted && !termsAgreed,
    agreeToTerms: (value: boolean) => setAgreedVersion(value && termsChange ? termsChange.now.version : null),
    goTo,
    next: () => {
      if (!isStepValid(step, form, ctx)) {
        dispatch({ type: 'attempt', steps: [step] });
        return;
      }
      const target = nextStep(ctx.flow, step, ctx.zones);
      if (target) goTo(target);
    },
    back: () => {
      const target = prevStep(ctx.flow, step, ctx.zones);
      if (target) goTo(target);
    },
    /** «Отменить изменения»: forget the draft of this tab. */
    discard: () => clearForm(storageKey),
    submit: () => {
      const invalid = firstInvalidStep(form, ctx);
      const ready = ctx.flow === 'edit' ? toEdit(form, ctx) : toSubmission(form, ctx);
      if (invalid || !ready) {
        dispatch({ type: 'attempt', steps: [invalid ?? step] });
        // Navigating to the same step would let the router restore the old scroll over the focused error summary.
        if (invalid && invalid !== step) goTo(invalid);
        return;
      }
      if (!termsAgreed) {
        setTermsAttempted(true);
        return;
      }
      submission.mutate(plan);
    },
  };
}

export type CampaignWizardState = ReturnType<typeof useCampaignWizard>;
