import { TARIFFS, type TariffCode } from '../cabinet/tariffs';

const KEY = 'apex-campaign-intent-v1';
const PATH = '/cabinet/campaigns/new';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface CampaignIntent { tariff?: TariffCode; storeId?: string }

export function campaignIntentFromParams(params: URLSearchParams): CampaignIntent {
  const tariff = TARIFFS.find((item) => item.code === params.get('tariff'))?.code;
  const store = params.get('store');
  return { tariff, storeId: store && UUID.test(store) ? store : undefined };
}

export function campaignIntentHref(intent: CampaignIntent = {}): string {
  const params = new URLSearchParams();
  if (intent.tariff) params.set('tariff', intent.tariff);
  if (intent.storeId) params.set('store', intent.storeId);
  return `${PATH}${params.size ? `?${params}` : ''}`;
}

/** Only a campaign choice is persisted, never an arbitrary redirect or account data. */
export function rememberCampaignIntent(intent: CampaignIntent): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ href: campaignIntentHref(intent), expires: Date.now() + 86_400_000 })); } catch { /* Navigation works without storage. */ }
}

export function postAuthDestination(): string {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (!value || typeof value !== 'object' || !('href' in value) || typeof value.href !== 'string' || !('expires' in value) || typeof value.expires !== 'number' || value.expires < Date.now()) return '/cabinet';
    const url = new URL(value.href, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== PATH) return '/cabinet';
    return campaignIntentHref(campaignIntentFromParams(url.searchParams));
  } catch { return '/cabinet'; }
}

export function clearCampaignIntent(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* Storage may be blocked. */ }
}
