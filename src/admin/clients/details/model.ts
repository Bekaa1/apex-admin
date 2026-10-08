import { CLIENT_PAGE_SIZE } from '../model';

export type ClientTab = 'campaigns' | 'invoices';
const pageKeys = { campaigns: 'campaign_page', invoices: 'invoice_page' } as const;

export function clientTabSelection(params: URLSearchParams) {
  const raw = params.get('tab') ?? 'campaigns';
  const tab: ClientTab = raw === 'invoices' ? 'invoices' : 'campaigns';
  const key = pageKeys[tab];
  const value = params.get(key) ?? '1';
  const number = Number(value);
  const invalidPage = !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(number)
    || number > Math.floor(Number.MAX_SAFE_INTEGER / CLIENT_PAGE_SIZE) || params.getAll(key).length > 1;
  const error = !['campaigns', 'invoices'].includes(raw) || params.getAll('tab').length > 1 || invalidPage;
  return { tab, page: invalidPage ? 1 : number, error };
}

export function clientTabParams(previous: URLSearchParams, tab: ClientTab, page?: number) {
  const next = new URLSearchParams(previous);
  next.set('tab', tab);
  if (page !== undefined) next.set(pageKeys[tab], String(page));
  return next;
}
