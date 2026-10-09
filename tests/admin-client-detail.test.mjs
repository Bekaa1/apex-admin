import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';

// Only synthetic data and dependencies. No env files, network or production accounts.
const require = createRequire(import.meta.url);
function load(file, modules = {}) {
  const exports = {};
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, URLSearchParams, URL, require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name.endsWith('/statusTone')) return load('src/admin/statusTone.ts', {});
      if (name in modules) return modules[name];
      throw new Error('Unexpected dependency: ' + name);
    },
  }, { filename: file });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const profile = n => ({ id: id(n), display_id: n, full_name: null, display_name: null, company_name: null, bin: null, email: null, phone: null, created_at: null });
const model = load('src/admin/clients/model.ts');
const access = load('src/admin/clients/access.ts');
const closedAccess = { clientsAccessConfigured: () => false };
const tabModel = load('src/admin/clients/details/model.ts', { '../model': model });
const campaignModel = load('src/admin/campaigns/model.ts', {
  '../../lib/database.types': { Constants: { public: { Enums: { ad_status: [] } } } },
  '../../cabinet/campaignStatus': { STATUS_TONE: {} },
});
const invoiceModel = load('src/admin/invoices/model.ts');
const signal = () => new AbortController().signal;
const response = (data, count = null) => ({ data, count, error: null, status: 200 });

function backend(responses = {}) {
  const requests = [];
  const client = { from(table) {
    const request = { table, calls: [] };
    requests.push(request);
    const result = responses[table]?.shift();
    const builder = { then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
    for (const method of ['select', 'eq', 'is', 'or', 'filter', 'order', 'range', 'in', 'limit', 'abortSignal', 'maybeSingle']) {
      builder[method] = (...args) => { request.calls.push([method, ...args]); return builder; };
    }
    return builder;
  } };
  return { client, requests };
}
function clientApi(mock, configured = true) {
  return load('src/admin/clients/api.ts', { '../../lib/supabase': { requireSupabase: () => mock.client }, './model': model,
    './access': configured ? access : closedAccess });
}
function campaignApi(mock) {
  return load('src/admin/campaigns/api.ts', { '../../lib/supabase': { requireSupabase: () => mock.client }, './model': campaignModel });
}
function invoiceApi(mock) {
  return load('src/admin/invoices/api.ts', { '../../lib/supabase': { requireSupabase: () => mock.client }, './model': invoiceModel });
}
const campaign = (n, clientId) => ({ id: id(100 + n), user_id: clientId, display_id: n, title: null, name: null, status: 'legacy', tariff_id: null,
  budget: null, paid_amount: null, spent_budget: null, created_at: null });
const invoice = (n, clientId) => ({ id: id(200 + n), user_id: clientId, ad_id: id(100 + n), number: n, kind: 'legacy', amount: null, status: null, issued_at: null, paid_at: null });

test('closed profile source blocks card and both related adapters before any Supabase call', async () => {
  const mock = backend();
  const api = clientApi(mock, false);
  let relatedReads = 0;
  const related = load('src/admin/clients/details/api.ts', {
    '../../campaigns/api': { fetchCampaignPage() { relatedReads++; } }, '../../invoices/api': { fetchInvoicePage() { relatedReads++; } },
    '../access': closedAccess, '../api': api, '../model': model,
  });
  for (const read of [() => api.fetchClientProfile(id(1), signal()), () => related.fetchClientCampaigns(id(1), 1, signal()), () => related.fetchClientInvoices(id(1), 1, signal())]) {
    await assert.rejects(read(), error => error.kind === 'unconfigured');
  }
  assert.equal(mock.requests.length, 0); assert.equal(relatedReads, 0);
});

test('profile adapter uses same fixed fields and UUID equality; invalid IDs and mismatched responses fail closed', async () => {
  const mock = backend({ users: [response(profile(1))] });
  const api = clientApi(mock);
  await assert.rejects(api.fetchClientProfile('bad', signal()), error => error.kind === 'invalid');
  assert.equal(mock.requests.length, 0);
  assert.equal((await api.fetchClientProfile(id(1), signal())).id, id(1));
  assert.equal(mock.requests.length, 1); assert.equal(mock.requests[0].table, 'users');
  assert.deepEqual(plain(mock.requests[0].calls.filter(call => call[0] === 'eq')), [['eq', 'id', id(1)], ['eq', 'role', 'Пользователь']]);
  assert.equal(mock.requests[0].calls.find(call => call[0] === 'select')[1], 'id,display_id,full_name,display_name,company_name,bin,email,phone,created_at');
  assert.ok(mock.requests[0].calls.some(call => call[0] === 'maybeSingle'));
  assert.deepEqual(plain(mock.requests[0].calls.filter(call => call[0] === 'is')), [['is', 'partner_id', null]]);
  for (const data of [profile(2), { ...profile(1), email: {} }]) {
    await assert.rejects(clientApi(backend({ users: [response(data)] })).fetchClientProfile(id(1), signal()), error => error.kind === 'invalid');
  }
});

test('profile absent, denied, missing API and failed request remain distinct', async () => {
  assert.equal(await clientApi(backend({ users: [response(null)] })).fetchClientProfile(id(1), signal()), null);
  for (const [code, status, kind] of [['42501', 403, 'denied'], ['PGRST205', 404, 'missing'], ['', 503, 'unavailable']]) {
    const result = { data: null, error: { code, message: 'Never expose raw details' }, status };
    await assert.rejects(clientApi(backend({ users: [result] })).fetchClientProfile(id(1), signal()), error => error.kind === kind && !error.message.includes('raw'));
  }
});

test('client adapters require UUID/page and always forward client scope to existing APIs', async () => {
  const calls = [];
  const api = load('src/admin/clients/details/api.ts', {
    '../../campaigns/api': { fetchCampaignPage: (...args) => { calls.push(['ads', ...args]); return {}; } },
    '../../invoices/api': { fetchInvoicePage: (...args) => { calls.push(['invoices', ...args]); return {}; } },
    '../access': { clientsAccessConfigured: () => true }, '../api': clientApi(backend()), '../model': model,
  });
  for (const read of [api.fetchClientCampaigns, api.fetchClientInvoices]) {
    for (const [client, page] of [['', 1], ['bad', 1], [id(1), 0], [id(1), 1.5], [id(1), Number.MAX_SAFE_INTEGER]]) {
      await assert.rejects(read(client, page, signal()), error => error.kind === 'invalid');
    }
  }
  assert.equal(calls.length, 0);
  const requestSignal = signal();
  await api.fetchClientCampaigns(id(1), 2, requestSignal); await api.fetchClientInvoices(id(2), 3, requestSignal);
  assert.deepEqual(plain(calls[0][1]), { filters: { search: '', status: '' }, page: 2, error: null });
  assert.equal(calls[0][2], requestSignal); assert.equal(calls[0][3], 'all'); assert.equal(calls[0][4], id(1));
  assert.deepEqual(plain(calls[1][1]), { filters: { search: '', status: '', kind: '' }, page: 3, error: null });
  assert.equal(calls[1][3], id(2));
});

test('actual campaign/invoice requests and next-record probes enforce user_id and 25-row ranges', async () => {
  for (const kind of ['campaigns', 'invoices']) {
    const isCampaign = kind === 'campaigns';
    const table = isCampaign ? 'ads' : 'advertiser_invoices';
    const row = isCampaign ? campaign : invoice;
    const mocks = { users: [response([])] };
    if (!isCampaign) mocks.ads = [response([])];
    mocks[table] = [response(Array.from({ length: 25 }, (_, n) => row(n + 1, id(1)))), response([{ id: id(99) }])];
    const mock = backend(mocks);
    const api = isCampaign ? campaignApi(mock) : invoiceApi(mock);
    const selection = isCampaign ? campaignModel.readSelection(new URLSearchParams('page=2')) : invoiceModel.readSelection(new URLSearchParams('page=2'));
    const data = isCampaign ? await api.fetchCampaignPage(selection, signal(), 'all', id(1)) : await api.fetchInvoicePage(selection, signal(), id(1));
    assert.equal(data.rows.length, 25); assert.equal(data.count, null); assert.equal(data.hasNext, true);
    const reads = mock.requests.filter(request => request.table === table);
    assert.equal(reads.length, 2);
    for (const request of reads) {
      assert.deepEqual(plain(request.calls.filter(call => call[0] === 'eq')), [['eq', 'user_id', id(1)]]);
      assert.deepEqual(plain(request.calls.filter(call => call[0] === 'order')), [
        ['order', isCampaign ? 'created_at' : 'issued_at', { ascending: false, nullsFirst: false }], ['order', 'id', { ascending: false }],
      ]);
    }
    assert.deepEqual(plain(reads[0].calls.find(call => call[0] === 'range')), ['range', 25, 49]);
    assert.deepEqual(plain(reads[1].calls.find(call => call[0] === 'range')), ['range', 50, 50]);
    assert.equal(mock.requests.filter(request => request.table === 'users').length, 1);
    assert.equal(data.profilesUnavailable, true); // Missing names do not erase records.
  }
});

test('scoped existing APIs reject a different client and invalid scope; unscoped behavior is preserved', async () => {
  for (const kind of ['campaigns', 'invoices']) {
    const campaigns = kind === 'campaigns';
    const table = campaigns ? 'ads' : 'advertiser_invoices';
    const model = campaigns ? campaignModel : invoiceModel;
    const mock = backend({ [table]: [response([campaigns ? campaign(1, id(2)) : invoice(1, id(2))], 1)] });
    const api = campaigns ? campaignApi(mock) : invoiceApi(mock);
    const read = client => campaigns ? api.fetchCampaignPage(model.readSelection(new URLSearchParams()), signal(), 'all', client)
      : api.fetchInvoicePage(model.readSelection(new URLSearchParams()), signal(), client);
    await assert.rejects(read(''), error => error.kind === 'invalid'); assert.equal(mock.requests.length, 0);
    await assert.rejects(read(id(1)), error => error.kind === 'invalid'); assert.equal(mock.requests.length, 1);
    const unscoped = backend({ [table]: [response([], 0)] });
    if (campaigns) await campaignApi(unscoped).fetchCampaignPage(model.readSelection(new URLSearchParams()), signal());
    else await invoiceApi(unscoped).fetchInvoicePage(model.readSelection(new URLSearchParams()), signal());
    assert.equal(unscoped.requests[0].calls.some(call => call[0] === 'eq' && call[1] === 'user_id'), false);
  }
});

test('each tab preserves its own URL page; malformed URL cannot trigger an unbounded query', () => {
  const params = new URLSearchParams('tab=campaigns&campaign_page=2&invoice_page=3');
  assert.deepEqual(plain(tabModel.clientTabSelection(params)), { tab: 'campaigns', page: 2, error: false });
  const invoices = tabModel.clientTabParams(params, 'invoices');
  assert.equal(tabModel.clientTabSelection(invoices).page, 3);
  const next = tabModel.clientTabParams(invoices, 'invoices', 4);
  assert.equal(next.get('campaign_page'), '2'); assert.equal(next.get('invoice_page'), '4');
  assert.equal(tabModel.clientTabSelection(tabModel.clientTabParams(next, 'campaigns')).page, 2);
  for (const query of ['tab=unknown', 'tab=invoices&tab=campaigns', 'campaign_page=0', 'campaign_page=1.2', 'campaign_page=1&campaign_page=2', 'campaign_page=9007199254740991']) {
    assert.equal(tabModel.clientTabSelection(new URLSearchParams(query)).error, true);
  }
});

function hookHarness({ configured = true, session = { user: { id: id(9) } }, status = 'ready', read = async client => ({ client }) } = {}) {
  let options;
  const hooks = load('src/admin/clients/details/useClientDetail.ts', {
    '@tanstack/react-query': { useQuery: value => { options = value; return {}; } },
    '../../../auth/useAuthSession': { useAuthSession: () => ({ session, status }) },
    '../access': { clientsAccessConfigured: () => configured }, '../api': { fetchClientProfile: read }, '../model': model,
    './api': { fetchClientCampaigns: read, fetchClientInvoices: read },
  });
  return { options(name, client, page = 1) { hooks[name](client, page); return options; } };
}
test('profile/tab hooks require independent source confirmation, session and valid scope; keys include viewer/client/page', () => {
  for (const name of ['useClientProfile', 'useClientCampaigns', 'useClientInvoices']) {
    for (const context of [{ configured: false }, { session: null }, { status: 'loading' }]) {
      assert.equal(hookHarness(context).options(name, id(1)).enabled, false);
    }
    assert.equal(hookHarness().options(name, 'bad').enabled, false);
    const first = hookHarness().options(name, id(1), 2);
    const second = hookHarness().options(name, id(2), 2);
    assert.equal(first.enabled, true); assert.equal(first.retry, false); assert.equal(first.placeholderData, undefined);
    assert.ok(first.queryKey.includes(id(9))); assert.ok(first.queryKey.includes(id(1)));
    assert.notDeepEqual(plain(first.queryKey), plain(second.queryKey));
    if (name !== 'useClientProfile') {
      assert.equal(first.queryKey.at(-1), 2);
      assert.notDeepEqual(plain(first.queryKey), plain(hookHarness().options(name, id(1), 3).queryKey));
      assert.equal(hookHarness().options(name, id(1), 0).enabled, false);
    }
  }
});

const tick = () => new Promise(resolve => setImmediate(resolve));
test('real QueryObserver clears previous client during switching and ignores late previous responses for every tab/profile', async () => {
  for (const name of ['useClientProfile', 'useClientCampaigns', 'useClientInvoices']) {
    const deferred = new Map();
    const harness = hookHarness({ read: client => new Promise(resolve => { deferred.set(client, resolve); }) });
    const cache = new QueryClient();
    const observer = new QueryObserver(cache, harness.options(name, id(1), 1));
    const unsubscribe = observer.subscribe(() => {});
    const oldRead = observer.refetch();
    observer.setOptions(harness.options(name, id(2), 1));
    assert.equal(observer.getCurrentResult().data, undefined); assert.equal(observer.getCurrentResult().isPending, true);
    const newRead = observer.refetch();
    deferred.get(id(1))({ id: id(1) }); await oldRead; await tick();
    assert.equal(observer.getCurrentResult().data, undefined);
    deferred.get(id(2))({ id: id(2) }); await newRead; await tick();
    assert.equal(observer.getCurrentResult().data.id, id(2));
    observer.setOptions(harness.options(name, id(3), 1));
    assert.equal(observer.getCurrentResult().data, undefined); // Not keepPreviousData.
    const thirdRead = observer.refetch(); deferred.get(id(3))({ id: id(3) }); await thirdRead;
    assert.equal(observer.getCurrentResult().data.id, id(3));
    unsubscribe(); observer.destroy(); cache.clear();
  }
});

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
const i18n = { useI18n: () => ({ t: key => key, lang: 'ru' }) };
function pageHarness() {
  const context = { configured: false, id: id(1), state: { returnTo: '/admin/clients?search=synthetic&display_id=2&page=4' }, params: new URLSearchParams(), query: { isPending: true }, lastNavigation: null, retries: 0 };
  const api = clientApi(backend());
  const { ClientDetailPage } = load('src/admin/clients/details/ClientDetailPage.tsx', {
    'react-router': { useParams: () => ({ id: context.id }), useLocation: () => ({ state: context.state }),
      useSearchParams: () => [context.params, (next, options) => { context.lastNavigation = { next, options }; }] },
    '../../../design-system': { Alert: 'Alert', Button: 'Button', Tabs: 'Tabs' }, '../../../i18n/i18n': i18n,
    '../../../auth/usePermissions': { usePermissions: () => ({ can: () => true }) },
    '../../../auth/RequirePermission': { PermissionDenied: 'PermissionDenied' },
    '../../../navigation/returnTo': load('src/navigation/returnTo.ts'), '../../overview/model': { overviewDate: (_date, _lang, fallback) => fallback },
    '../../overview/OverviewState': { OverviewLoading: 'OverviewLoading' },
    '../../campaigns/details/DetailState': { DetailField: ({ label, children }) => require('react').createElement('div', {}, require('react').createElement('dt', {}, label), require('react').createElement('dd', {}, children)) },
    '../access': { clientsAccessConfigured: () => context.configured }, '../api': api, '../model': model,
    './ClientRecords': { ClientCampaigns: 'ClientCampaigns', ClientInvoices: 'ClientInvoices' }, './model': tabModel,
    './useClientDetail': { useClientProfile: () => ({ refetch: () => { context.retries++; }, ...context.query }) },
    '../../campaigns/details/CampaignDetail.module.css': {}, '../ClientsPage.module.css': {},
  });
  function content() {
    const child = nodes(ClientDetailPage()).find(node => typeof node.type === 'function' && node.type.name === 'ClientContent');
    return child?.type(child.props);
  }
  return { context, api, page: ClientDetailPage, content };
}

test('card fails closed before mounting content; UUID, loading, denial, error/retry and absence are distinct', () => {
  const { context, api, page, content } = pageHarness();
  const has = (element, text) => nodes(element).some(node => node.props.children === text || node.props.title === text);
  assert.ok(has(page(), 'adminClientDetail.unconfigured')); assert.equal(content(), undefined);
  context.id = 'bad'; assert.ok(has(page(), 'adminClientDetail.invalidId')); assert.equal(content(), undefined);
  context.id = id(1); context.configured = true;
  assert.equal(content().type, 'OverviewLoading');
  for (const kind of ['denied', 'missing', 'invalid', 'unavailable']) {
    context.query = { isError: true, error: new api.ClientReadError(kind), data: profile(1) };
    const result = content(); assert.equal(result.type, 'Alert'); assert.equal(result.props.children, `adminClientDetail.errors.${kind}`);
    result.props.action.props.onClick();
  }
  assert.equal(context.retries, 4);
  context.query = { data: null }; assert.ok(has(content(), 'adminClientDetail.notFound'));
});

test('profile renders missing values, literal long text and profile contacts without balance or account-state claims', () => {
  const { context, content } = pageHarness(); context.configured = true;
  context.query = { data: { ...profile(1), display_id: null, full_name: ' ', display_name: 'Not the full name', company_name: '<script>synthetic</script>' + 'x'.repeat(1200), bin: '000000000000', balance: 999, is_active: false } };
  const node = nodes(content()).find(node => typeof node.type === 'function' && node.type.name === 'ClientProfile');
  const html = renderToStaticMarkup(node);
  assert.ok(html.includes('&lt;script&gt;synthetic&lt;/script&gt;')); assert.ok(html.includes('000000000000'));
  assert.ok(html.includes('adminClients.notSpecified')); assert.ok(html.includes('adminClientDetail.contacts'));
  assert.equal(html.includes('Not the full name'), false); assert.equal(html.includes('999'), false);
  assert.equal(/<input|<button|mailto:|tel:/.test(html), false);
});

test('tab navigation and independent pagination retain original list filters; direct card safely returns to list', () => {
  const { context, page, content } = pageHarness(); context.configured = true; context.query = { data: profile(1) };
  context.params = new URLSearchParams('tab=campaigns&campaign_page=2&invoice_page=3');
  let elements = nodes(content());
  assert.equal(elements.find(node => node.type === 'ClientCampaigns').props.page, 2);
  assert.equal(elements.some(node => node.type === 'ClientInvoices'), false);
  const tabs = elements.find(node => node.type === 'Tabs'); tabs.props.onChange('invoices');
  assert.equal(context.lastNavigation.next.get('campaign_page'), '2');
  assert.equal(context.lastNavigation.options.state.returnTo, context.state.returnTo);
  context.params = context.lastNavigation.next; elements = nodes(content());
  const invoices = elements.find(node => node.type === 'ClientInvoices');
  assert.equal(invoices.props.id, id(1)); assert.equal(invoices.props.page, 3); invoices.props.onPage(4);
  assert.equal(context.lastNavigation.next.get('invoice_page'), '4'); assert.equal(context.lastNavigation.options.state.returnTo, context.state.returnTo);
  assert.equal(nodes(page()).find(node => node.type === 'Button').props.href, context.state.returnTo);
  for (const state of [null, { returnTo: 'https://external.invalid' }, { returnTo: '//external.invalid' }, { returnTo: '/admin/invoices?page=3' }]) {
    context.state = state; assert.equal(nodes(page()).find(node => node.type === 'Button').props.href, '/admin/clients');
  }
  context.params = new URLSearchParams('campaign_page=invalid');
  assert.equal(nodes(content()).some(node => ['ClientCampaigns', 'ClientInvoices'].includes(node.type)), false);
  assert.ok(nodes(content()).some(node => typeof node.type === 'function' && node.type.name === 'ClientProfile'));
});

test('related tab failures/loading/empty states reuse existing tables without hiding profile or inventing totals', () => {
  let configured = true, query, retries = 0, nextPage;
  const apis = { client: clientApi(backend()), campaigns: campaignApi(backend()), invoices: invoiceApi(backend()) };
  const views = load('src/admin/clients/details/ClientRecords.tsx', {
    '../../../design-system': { Alert: 'Alert', Button: 'Button' }, '../../../i18n/i18n': i18n, '../../../lib/format': { formatNumber: String },
    '../../campaigns/api': apis.campaigns, '../../invoices/api': apis.invoices,
    '../../campaigns/CampaignTable': { CampaignTable: 'CampaignTable' }, '../../invoices/InvoiceTable': { InvoiceTable: 'InvoiceTable' },
    '../../overview/OverviewState': { OverviewLoading: 'OverviewLoading' }, '../access': { clientsAccessConfigured: () => configured },
    '../api': apis.client, '../model': model,
    './useClientDetail': { useClientCampaigns: () => ({ refetch() { retries++; }, ...query }), useClientInvoices: () => ({ refetch() { retries++; }, ...query }) },
    '../../campaigns/CampaignsPage.module.css': {},
  });
  for (const [name, table] of [['ClientCampaigns', 'CampaignTable'], ['ClientInvoices', 'InvoiceTable']]) {
    const render = () => { const node = views[name]({ id: id(1), page: 1, onPage: page => { nextPage = page; } }); return node.type(node.props); };
    query = { isPending: true }; assert.equal(render().type, 'OverviewLoading');
    query = { isError: true, error: new apis.invoices.InvoiceReadError('denied') };
    assert.equal(render().props.title, 'adminClients.deniedTitle'); render().props.action.props.onClick();
    query = { data: { rows: [], count: 0, hasNext: false } }; assert.ok(nodes(render()).some(node => node.props.role === 'status'));
    query = { data: { rows: [{ id: id(1) }], count: null, hasNext: true } };
    let elements = nodes(render());
    const holder = elements.find(node => node.type === table); assert.ok(holder);
    assert.ok(elements.some(node => node.props.children === 'adminClients.countUnknown'));
    elements.find(node => node.type === 'Button' && node.props.children === 'adminClients.next').props.onClick(); assert.equal(nextPage, 2);
    query.isFetching = true; elements = nodes(render());
    assert.equal(elements.find(node => node.type === 'Button' && node.props.children === 'adminClients.next').props.disabled, true);
    configured = false; assert.equal(render().props.children, 'adminClientDetail.unconfigured'); configured = true;
  }
  assert.equal(retries, 2);
});

test('detail dictionaries have matching keys and exact unconfigured Russian text; route remains within guard', () => {
  const keys = (value, prefix = '') => Object.entries(value).flatMap(([key, item]) => typeof item === 'object' ? keys(item, prefix + key + '.') : [prefix + key]).sort();
  const dictionaries = ['ru', 'kk', 'en'].map(lang => JSON.parse(readFileSync(new URL(`../src/i18n/adminClientDetail.${lang}.json`, import.meta.url))));
  assert.deepEqual(keys(dictionaries[0]), keys(dictionaries[1])); assert.deepEqual(keys(dictionaries[0]), keys(dictionaries[2]));
  assert.equal(dictionaries[0].unconfigured, 'Административный доступ к профилю не настроен');
  const routes = readFileSync(new URL('../src/routes/admin.tsx', import.meta.url), 'utf8');
  assert.equal((routes.match(/element: <RequireAdmin\s/g) ?? []).length, 1);
  assert.ok(routes.indexOf("path: 'clients/:id'") > routes.indexOf('element: <RequireAdmin'));
  assert.ok(routes.indexOf("path: 'clients/:id'") < routes.indexOf('element: <AdminNotFound'));
});
