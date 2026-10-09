import type { TariffCode } from '../../tariffs';
import type { CampaignForm, MediaField, MediaMeta, MediaProblem, MediaState, StepId } from './types';

export interface WizardState {
  form: CampaignForm;
  /** Steps the user tried to leave: their errors are shown. */
  attempted: StepId[];
  /** Grows on every failed attempt so the error summary takes focus again. */
  attempts: number;
}

export type WizardAction =
  | { type: 'name'; value: string }
  | { type: 'description'; value: string }
  | { type: 'mediaStarted'; field: MediaField; uploadId: number; fileName: string; meta: MediaMeta }
  | { type: 'mediaProgress'; field: MediaField; uploadId: number; progress: number }
  | { type: 'mediaReady'; field: MediaField; uploadId: number; url: string }
  | { type: 'mediaFailed'; field: MediaField; fileName: string; meta: MediaMeta | null; problem: MediaProblem; uploadId?: number }
  | { type: 'mediaCleared'; field: MediaField }
  | { type: 'tariff'; value: TariffCode }
  | { type: 'toggleStore'; storeId: string }
  | { type: 'stores'; storeIds: string[] }
  | { type: 'toggleZone'; zoneId: string }
  | { type: 'zones'; zoneIds: string[] }
  | { type: 'budget'; value: number | null }
  | { type: 'dailyLimit'; value: string }
  | { type: 'rules'; value: boolean }
  | { type: 'attempt'; steps: StepId[] };

export function emptyForm(): CampaignForm {
  return {
    name: '',
    description: '',
    video: { status: 'empty' },
    cover: { status: 'empty' },
    tariff: null,
    storeIds: [],
    zoneIds: [],
    budget: null,
    dailyLimit: '',
    rulesAccepted: false,
    requestId: crypto.randomUUID(),
  };
}

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function withMedia(form: CampaignForm, field: MediaField, media: MediaState): CampaignForm {
  return field === 'video' ? { ...form, video: media } : { ...form, cover: media };
}

/** Progress and results of a replaced or cancelled upload arrive late; only the current upload may change the field. */
function isCurrentUpload(media: MediaState, uploadId: number | undefined): boolean {
  return uploadId === undefined || (media.status === 'uploading' && media.uploadId === uploadId);
}

function formReducer(form: CampaignForm, action: WizardAction): CampaignForm {
  switch (action.type) {
    case 'name':
      return { ...form, name: action.value };
    case 'description':
      return { ...form, description: action.value };
    case 'mediaStarted':
      return withMedia(form, action.field, { status: 'uploading', uploadId: action.uploadId, fileName: action.fileName, meta: action.meta, progress: 0 });
    case 'mediaProgress': {
      const media = form[action.field];
      if (media.status !== 'uploading' || media.uploadId !== action.uploadId) return form;
      return withMedia(form, action.field, { ...media, progress: action.progress });
    }
    case 'mediaReady': {
      const media = form[action.field];
      if (media.status !== 'uploading' || media.uploadId !== action.uploadId) return form;
      return withMedia(form, action.field, { status: 'ready', url: action.url, fileName: media.fileName, meta: media.meta });
    }
    case 'mediaFailed':
      if (!isCurrentUpload(form[action.field], action.uploadId)) return form;
      return withMedia(form, action.field, { status: 'failed', fileName: action.fileName, meta: action.meta, problem: action.problem });
    case 'mediaCleared':
      return withMedia(form, action.field, { status: 'empty' });
    case 'tariff':
      return { ...form, tariff: action.value };
    case 'toggleStore':
      return { ...form, storeIds: toggle(form.storeIds, action.storeId) };
    case 'stores':
      return { ...form, storeIds: action.storeIds };
    case 'toggleZone':
      return { ...form, zoneIds: toggle(form.zoneIds, action.zoneId) };
    case 'zones':
      return { ...form, zoneIds: action.zoneIds };
    case 'budget':
      return { ...form, budget: action.value };
    case 'dailyLimit':
      return { ...form, dailyLimit: action.value };
    case 'rules':
      return { ...form, rulesAccepted: action.value };
    case 'attempt':
      return form;
  }
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  if (action.type === 'attempt') {
    return { ...state, attempted: [...new Set([...state.attempted, ...action.steps])], attempts: state.attempts + 1 };
  }
  const form = formReducer(state.form, action);
  return form === state.form ? state : { ...state, form };
}
