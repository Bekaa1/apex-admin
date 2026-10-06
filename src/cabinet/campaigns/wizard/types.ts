import type { TariffCode } from '../../tariffs';
import type { Moderation } from '../types';

export type StepId = 'media' | 'tariff' | 'stores' | 'zones' | 'budget';
export type MediaField = 'video' | 'cover';

/** Why a file can't be used; texts in `campaigns.wizard.media.errors.*`. */
export type MediaProblem = 'type' | 'size' | 'duration' | 'orientation' | 'ratio' | 'resolution' | 'unreadable' | 'network' | 'frame';

export interface MediaMeta {
  sizeBytes: number | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
}

export type MediaState =
  | { status: 'empty' }
  | { status: 'uploading'; uploadId: number; fileName: string; meta: MediaMeta; progress: number }
  | { status: 'failed'; fileName: string; meta: MediaMeta | null; problem: MediaProblem }
  | { status: 'ready'; url: string; fileName: string; meta: MediaMeta | null };

export interface CampaignForm {
  name: string;
  description: string;
  video: MediaState;
  cover: MediaState;
  tariff: TariffCode | null;
  storeIds: string[];
  /** Zone ids across the chosen stores (a zone belongs to one store). */
  zoneIds: string[];
  budget: number | null;
  rulesAccepted: boolean;
}

export interface CatalogStore {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  /** null until the backend shares cart counts. */
  carts: number | null;
  activeCampaigns: number | null;
}

export interface CatalogZone {
  id: string;
  storeId: string;
  name: string;
  /** Other brands showing in the zone; null until the backend shares it. */
  otherBrands: number | null;
}

export interface WizardCatalog {
  stores: CatalogStore[];
  zones: CatalogZone[];
}

export interface UploadedMedia {
  url: string;
  fileName: string;
}

/** Payload of the `submit_campaign` RPC requested from the backend (session-log). */
export interface CampaignSubmission {
  name: string;
  description: string;
  tariffCode: TariffCode;
  video: UploadedMedia & MediaMeta;
  cover: UploadedMedia | null;
  storeIds: string[];
  zoneIds: string[];
  budget: number;
}

export type WizardMode = { kind: 'new' } | { kind: 'fix'; campaignId: string; moderation: Moderation | null };

export interface WizardApi {
  uploadMedia: (file: Blob, fileName: string, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<UploadedMedia>;
  /** Absent until the backend adds `submit_campaign`: the button stays off. Resolves with the campaign id. */
  submit?: (submission: CampaignSubmission, mode: WizardMode) => Promise<string>;
}

/** What the success screen shows; passed in the navigation state. */
export interface SentReceipt {
  name: string;
  tariff: TariffCode;
  budget: number;
}

/** A campaign read back for «Исправить» and «Повторить»; the plan, description and stores are not stored yet. */
export interface CampaignPrefill {
  status: string | null;
  name: string;
  video: MediaState;
  cover: MediaState;
  budget: number | null;
  storeId: string | null;
  zoneIds: string[];
  moderation: Moderation | null;
}
