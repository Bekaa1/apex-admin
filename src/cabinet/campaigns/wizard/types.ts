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
  /** One id per form: resending after a lost answer returns the same campaign instead of creating a second one. */
  requestId: string;
}

export interface CatalogStore {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  /** null when the catalog doesn't report it (the cards and summary then skip carts). */
  carts: number | null;
  activeCampaigns: number | null;
}

export interface CatalogZone {
  id: string;
  storeId: string;
  name: string;
  /** Other advertisers showing in the zone now. */
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

/** What the wizard sends; the API turns it into the `submit_campaign` payload. */
export interface CampaignSubmission {
  name: string;
  description: string;
  tariffCode: TariffCode;
  video: UploadedMedia & { durationSec: number; width: number; height: number; sizeBytes: number };
  cover: UploadedMedia | null;
  storeIds: string[];
  zoneIds: string[];
  budget: number;
  requestId: string;
}

export type WizardMode = { kind: 'new' } | { kind: 'fix'; campaignId: string; moderation: Moderation | null };

export interface WizardApi {
  uploadMedia: (file: Blob, fileName: string, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<UploadedMedia>;
  /** Resolves with the campaign id; a fix resends the returned campaign. */
  submit: (submission: CampaignSubmission, mode: WizardMode) => Promise<string>;
}

/** What the success screen shows; passed in the navigation state. */
export interface SentReceipt {
  name: string;
  tariff: TariffCode;
  budget: number;
}

/** A campaign read back for «Исправить» and «Повторить». */
export interface CampaignPrefill {
  status: string | null;
  name: string;
  description: string;
  tariff: TariffCode | null;
  video: MediaState;
  cover: MediaState;
  budget: number | null;
  storeIds: string[];
  zoneIds: string[];
  moderation: Moderation | null;
}
