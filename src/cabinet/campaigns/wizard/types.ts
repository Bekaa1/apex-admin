import type { TariffCode, TariffTerms } from '../../tariffs';
import type { Moderation } from '../types';

export type StepId = 'media' | 'tariff' | 'stores' | 'zones' | 'budget' | 'review';
/** A new campaign ends with the budget; an edit keeps the plan and the budget and ends with the review of changes. */
export type WizardFlow = 'new' | 'edit';
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

/** Stores with carts and their shelf zones, as `catalog_stores` and `catalog_zones` offer them. */
export interface StoreCatalog {
  stores: CatalogStore[];
  zones: CatalogZone[];
}

export interface WizardCatalog extends StoreCatalog {
  /** Plans on sale with their current minimum and terms version. */
  tariffs: TariffTerms[];
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
  /** The terms version the wizard showed: the server refuses with `tariff_changed` if the plan changed meanwhile. */
  tariffVersion: number;
  video: UploadedMedia & { durationSec: number; width: number; height: number; sizeBytes: number };
  cover: UploadedMedia | null;
  storeIds: string[];
  zoneIds: string[];
  budget: number;
  requestId: string;
}

/** What an edit sends to `edit_campaign`: the plan and the budget stay with the campaign. */
export type CampaignEdit = Omit<CampaignSubmission, 'tariffCode' | 'tariffVersion' | 'budget' | 'requestId'>;

/** The campaign being edited, as far as the wizard needs it. */
export interface EditedCampaign {
  id: string;
  /** Shows run now: the edit pauses them until the moderator approves. */
  running: boolean;
  rejected: boolean;
  /** Shows already started once; budget figures are «spent / left». */
  launched: boolean;
  budget: number;
  left: number;
  canTopUp: boolean;
}

export type WizardMode =
  | { kind: 'new' }
  | { kind: 'edit'; campaign: EditedCampaign; original: CampaignForm; moderation: Moderation | null };

export interface WizardApi {
  uploadMedia: (file: Blob, fileName: string, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<UploadedMedia>;
  /** Resolves with the new campaign id. */
  submit: (submission: CampaignSubmission) => Promise<string>;
  /** Sends the edited campaign back to moderation; resolves with its id. */
  edit: (campaignId: string, edit: CampaignEdit) => Promise<string>;
}

/** Fields the review of changes compares; texts in `campaigns.edit.fields.*`. */
export type ChangeField = 'name' | 'description' | 'video' | 'cover' | 'stores' | 'zones';

/** What the success screen shows; passed in the navigation state. */
export type SentReceipt =
  | { kind: 'new'; name: string; tariff: TariffCode; budget: number }
  | { kind: 'edit'; name: string; changed: ChangeField[]; paused: boolean };

/** A campaign read back for «Редактировать», «Исправить» and «Повторить». */
export interface CampaignPrefill {
  status: string | null;
  spent: number | null;
  launched: boolean;
  /** The plan is still sold, so the campaign can be topped up. */
  tariffSold: boolean;
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
