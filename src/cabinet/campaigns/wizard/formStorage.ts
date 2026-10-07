import { TARIFFS } from '../../tariffs';
import type { CampaignForm, MediaState, WizardMode } from './types';

// The wizard keeps what was typed in the tab's sessionStorage, so going to the corporate page and back, or a reload,
// loses nothing. Nothing is sent to the server until the campaign is submitted (there are no drafts).

const PREFIX = 'apex-campaign-form';

export function formStorageKey(userId: string, mode: WizardMode): string {
  return `${PREFIX}:${userId}:${mode.kind === 'fix' ? mode.campaignId : 'new'}`;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);
const readNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function prop(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}

function readMedia(value: unknown): MediaState {
  const url = prop(value, 'url');
  const fileName = prop(value, 'fileName');
  // Uploads don't survive a reload, and a failed file has to be picked again anyway.
  if (prop(value, 'status') !== 'ready' || !isString(url) || !isString(fileName)) return { status: 'empty' };
  const meta = prop(value, 'meta');
  return {
    status: 'ready',
    url,
    fileName,
    meta: meta
      ? { sizeBytes: readNumber(prop(meta, 'sizeBytes')), durationSec: readNumber(prop(meta, 'durationSec')), width: readNumber(prop(meta, 'width')), height: readNumber(prop(meta, 'height')) }
      : null,
  };
}

function readForm(value: unknown): CampaignForm {
  const name = prop(value, 'name');
  const description = prop(value, 'description');
  const storeIds = prop(value, 'storeIds');
  const zoneIds = prop(value, 'zoneIds');
  const requestId = prop(value, 'requestId');
  return {
    name: isString(name) ? name : '',
    description: isString(description) ? description : '',
    video: readMedia(prop(value, 'video')),
    cover: readMedia(prop(value, 'cover')),
    tariff: TARIFFS.find((t) => t.code === prop(value, 'tariff'))?.code ?? null,
    storeIds: isStringArray(storeIds) ? storeIds : [],
    zoneIds: isStringArray(zoneIds) ? zoneIds : [],
    budget: readNumber(prop(value, 'budget')),
    rulesAccepted: prop(value, 'rulesAccepted') === true,
    requestId: isString(requestId) && requestId ? requestId : crypto.randomUUID(),
  };
}

export function loadForm(key: string): CampaignForm | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? readForm(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveForm(key: string, form: CampaignForm): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(form));
  } catch {
    /* storage is full or blocked: the form still works, it just won't survive a reload */
  }
}

export function clearForm(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* nothing to clear */
  }
}
