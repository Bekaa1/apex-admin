import { fetchCampaignPage } from '../../campaigns/api';
import { fetchInvoicePage } from '../../invoices/api';
import { clientsAccessConfigured } from '../access';
import { ClientReadError } from '../api';
import { CLIENT_PAGE_SIZE, isClientId } from '../model';

function requireClientRead(id: string, page: number) {
  if (!clientsAccessConfigured()) throw new ClientReadError('unconfigured');
  if (!isClientId(id) || !Number.isSafeInteger(page) || page < 1
    || page > Math.floor(Number.MAX_SAFE_INTEGER / CLIENT_PAGE_SIZE)) throw new ClientReadError('invalid');
}

/** No unrestricted fallback. Both reads always pass a validated client scope. */
export async function fetchClientCampaigns(id: string, page: number, signal: AbortSignal) {
  requireClientRead(id, page);
  return fetchCampaignPage({ filters: { search: '', status: '' }, page, error: null }, signal, 'all', id);
}

export async function fetchClientInvoices(id: string, page: number, signal: AbortSignal) {
  requireClientRead(id, page);
  return fetchInvoicePage({ filters: { search: '', status: '', kind: '' }, page, error: null }, signal, id);
}
