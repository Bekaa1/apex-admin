import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

// Synthetic fixtures only in tests; no env, Auth service, real profiles or network.
const require = createRequire(import.meta.url);
function load(file, modules = {}) {
  const exports = {};
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, URLSearchParams, require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name in modules) return modules[name];
      throw new Error('Unexpected dependency: ' + name);
    },
  }, { filename: file });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const model = load('src/admin/clients/model.ts');
const access = load('src/admin/clients/access.ts');
const selection = (search = '') => model.readClientSelection(new URLSearchParams(search));
const fixture = n => ({ id: '00000000-0000-4000-8000-' + String(n).padStart(12, '0'), display_id: n,
  full_name: `Synthetic ${n}`, display_name: null, company_name: null, bin: null, email: null, phone: null, created_at: null });
function apiFixture(responses = [], configured = true) {
  const calls = [];
  const client = { from(table) {
    calls.push(['from', table]);
    return { select(...args) { calls.push(['select', ...args]); return this; },
      or(value) { calls.push(['or', value]); return this; }, eq(...args) { calls.push(['eq', ...args]); return this; },
      order(...args) { calls.push(['order', ...args]); return this; }, range(...args) { calls.push(['range', ...args]); return this; },
      abortSignal(signal) { assert.ok(signal); return Promise.resolve(responses.shift()); },
    };
  } };
  const api = load('src/admin/clients/api.ts', {
    '../../lib/supabase': { requireSupabase: () => { calls.push(['client']); return client; } },
    './model': model, './access': configured ? { clientsAccessConfigured: () => true } : access,
  });
  return { ...api, calls };
}

test('actual production access stays closed and immutable; direct adapter call obtains no client', async () => {
  assert.equal(access.clientsAccessConfigured(), false);
  assert.equal(access.CLIENTS_ACCESS.administrativeReadConfirmed, false);
  assert.equal(access.CLIENTS_ACCESS.clientScopeConfirmed, false);
  assert.equal(Object.isFrozen(access.CLIENTS_ACCESS), true);
  const api = apiFixture([], false);
  await assert.rejects(api.fetchClientPage(selection('admin=true&confirmed=true'), new AbortController().signal), error => error.kind === 'unconfigured');
  assert.equal(api.calls.length, 0);
});

test('hook requires configured source, session and valid selection even after RequireAdmin succeeds', async () => {
  let options;
  const realApi = apiFixture([], false);
  const hook = (source, session, status, chosen) => load('src/admin/clients/useClients.ts', {
    '@tanstack/react-query': { useQuery: value => { options = value; return {}; } },
    '../../auth/useAuthSession': { useAuthSession: () => ({ session, status }) },
    './access': source, './api': realApi,
  }).useClients(chosen);
  const session = { user: { id: fixture(9).id } };
  hook(access, session, 'ready', selection());
  assert.equal(options.enabled, false);
  await assert.rejects(options.queryFn({ signal: new AbortController().signal }), error => error.kind === 'unconfigured');
  assert.equal(realApi.calls.length, 0);
  for (const [auth, status, chosen] of [[null, 'ready', selection()], [session, 'loading', selection()], [session, 'ready', selection('display_id=no')]]) {
    hook({ clientsAccessConfigured: () => true }, auth, status, chosen); assert.equal(options.enabled, false);
  }
  hook({ clientsAccessConfigured: () => true }, session, 'ready', selection());
  assert.equal(options.enabled, true); assert.equal(options.retry, false);
  assert.deepEqual(plain(options.queryKey.slice(0, 3)), ['admin', 'clients', session.user.id]);
});

test('URL filters and page are validated, preserved and reset on new search', () => {
  for (const raw of ['-2', '1e4', '1.5', 'bad', '9007199254740992']) assert.equal(selection(`display_id=${raw}`).error, 'number');
  for (const raw of ['0', '-1', '1.5', 'bad', '9007199254740992']) assert.equal(selection(`page=${raw}`).error, 'page');
  for (const raw of ['search=one&search=two', 'display_id=1&display_id=2', 'search=%00', 'search=' + 'a'.repeat(257)]) assert.equal(selection(raw).error, 'filters');
  assert.equal(selection('page=1&page=2').error, 'page');
  assert.equal(model.displayNumber(' 00023 '), 23);
  assert.equal(model.displayNumber(''), null);
  const original = new URLSearchParams('search=old&display_id=7&page=3');
  const next = model.clientParams(original, { search: 'new', displayId: '8' }, 1);
  assert.equal(next.toString(), 'search=new&display_id=8&page=1');
  assert.equal(model.clientParams(next, selection(next.toString()).filters, 2).toString(), 'search=new&display_id=8&page=2');
});

function splitFilter(value) {
  const terms = [];
  let term = '', quoted = false, escaped = false;
  for (const char of value) {
    if (escaped) { term += char; escaped = false; continue; }
    if (char === '\\' && quoted) { term += char; escaped = true; continue; }
    if (char === '"') quoted = !quoted;
    if (char === ',' && !quoted) { terms.push(term); term = ''; } else term += char;
  }
  assert.equal(quoted, false); terms.push(term); return terms;
}
test('search escapes regex and quoted PostgREST grammar; injected input remains four literal terms', () => {
  for (const search of ['Example', '.*,display_id.gt.0', '",id.neq.0)', '(a|b)+[x]$', 'a\\b', '%_*', "O'Reilly", 'Қазақ']) {
    const terms = splitFilter(model.clientSearchFilter(search));
    assert.equal(terms.length, 4);
    ['full_name', 'display_name', 'company_name', 'email'].forEach((field, index) => {
      assert.ok(terms[index].startsWith(field + '.imatch.'));
      const pattern = JSON.parse(terms[index].slice((field + '.imatch.').length));
      assert.ok(new RegExp(pattern).test(search));
      assert.equal(pattern, search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    });
  }
});

test('prepared adapter requests only one ordered page and fixed profile fields, without role or finance assumptions', async () => {
  const chosen = selection('search=Sample&display_id=26&page=2');
  const api = apiFixture([{ data: [fixture(26)], error: null, status: 200, count: 26 }]);
  const result = await api.fetchClientPage(chosen, new AbortController().signal);
  assert.equal(result.hasNext, false); assert.equal(result.count, 26);
  assert.deepEqual(plain(api.calls.filter(call => call[0] === 'from')), [['from', 'users']]);
  const columns = api.calls.find(call => call[0] === 'select')[1];
  assert.equal(columns, 'id,display_id,full_name,display_name,company_name,bin,email,phone,created_at');
  assert.deepEqual(plain(api.calls.filter(call => call[0] === 'eq')), [['eq', 'display_id', 26]]);
  assert.deepEqual(plain(api.calls.filter(call => call[0] === 'order')), [['order', 'created_at', { ascending: false, nullsFirst: false }], ['order', 'id', { ascending: false }]]);
  assert.deepEqual(plain(api.calls.filter(call => call[0] === 'range')), [['range', 25, 49]]);
  const invalid = apiFixture();
  await assert.rejects(invalid.fetchClientPage(selection('display_id=oops'), new AbortController().signal), error => error.kind === 'invalid');
  assert.equal(invalid.calls.length, 0);
});

test('pagination without count probes one next record; truncated or malformed responses stay errors', async () => {
  const api = apiFixture([{ data: Array.from({ length: 25 }, (_, n) => fixture(n + 1)), error: null, status: 200, count: null },
    { data: [fixture(26)], error: null, status: 200, count: null }]);
  const result = await api.fetchClientPage(selection(), new AbortController().signal);
  assert.equal(result.rows.length, 25); assert.equal(result.count, null); assert.equal(result.hasNext, true);
  assert.deepEqual(plain(api.calls.filter(call => call[0] === 'range')), [['range', 0, 24], ['range', 25, 25]]);
  for (const response of [{ data: [fixture(1)], error: null, status: 200, count: 26 },
    { data: [{ ...fixture(1), display_id: '1' }], error: null, status: 200, count: 1 }]) {
    await assert.rejects(apiFixture([response]).fetchClientPage(selection(), new AbortController().signal), error => error.kind === 'invalid');
  }
});

test('denied, missing source and network failures never become an empty list', async () => {
  for (const [code, status, kind] of [['42501', 403, 'denied'], ['42P01', 404, 'missing'], ['PGRST205', 404, 'missing'], ['', 503, 'unavailable']]) {
    const api = apiFixture([{ data: null, error: { code, message: 'Synthetic server detail' }, status, count: null }]);
    await assert.rejects(api.fetchClientPage(selection(), new AbortController().signal), error => error.kind === kind && !error.message.includes('Synthetic'));
  }
});

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
const i18n = { useI18n: () => ({ t: key => key, lang: 'ru' }) };
test('UI covers unconfigured, loading, error/retry, denied, empty, no matches and paginated rows', () => {
  let configured = false, query = { data: { rows: [fixture(1)], count: 1, hasNext: false } }, retries = 0, targetPage;
  const api = apiFixture([], false);
  const { ClientResults } = load('src/admin/clients/ClientResults.tsx', {
    '../../design-system': { Alert: 'Alert', Button: 'Button' }, '../../i18n/i18n': i18n,
    '../../lib/format': { formatNumber: String }, '../overview/OverviewState': { OverviewLoading: 'OverviewLoading' },
    './access': { clientsAccessConfigured: () => configured }, './api': api, './ClientTable': { ClientTable: 'ClientTable' },
    './model': model, './useClients': { useClients: () => ({ refetch: () => { retries++; }, ...query }) },
    '../corporate-requests/CorporateRequestsPage.module.css': {},
  });
  const render = chosen => ClientResults({ selection: chosen ?? selection(), onPage: page => { targetPage = page; }, onReset() {} });
  assert.equal(render().props.title, 'adminClients.unconfigured.title');
  assert.equal(nodes(render()).some(node => node.type === 'ClientTable'), false);
  configured = true; query = { isPending: true };
  assert.equal(render().type, 'OverviewLoading');
  for (const kind of ['denied', 'missing', 'invalid', 'unavailable']) {
    query = { isError: true, error: new api.ClientReadError(kind), data: { rows: [fixture(1)] } };
    const result = render(); assert.equal(result.type, 'Alert');
    assert.equal(result.props.children, `adminClients.errors.${kind}`);
    result.props.action.props.onClick();
  }
  assert.equal(retries, 4);
  query = { data: { rows: [], count: 0, hasNext: false } };
  assert.ok(nodes(render()).some(node => node.type === 'h2' && node.props.children === 'adminClients.empty.title'));
  assert.ok(nodes(render(selection('search=none'))).some(node => node.type === 'h2' && node.props.children === 'adminClients.noMatches.title'));
  assert.ok(nodes(render(selection('page=2'))).some(node => node.type === 'h2' && node.props.children === 'adminClients.pageEmpty.title'));
  query = { data: { rows: [fixture(1)], count: null, hasNext: true } };
  const elements = nodes(render());
  assert.equal(elements.find(node => node.type === 'ClientTable').props.rows.length, 1);
  const next = elements.find(node => node.type === 'Button' && node.props.children === 'adminClients.next');
  assert.equal(Boolean(next.props.disabled), false); next.props.onClick(); assert.equal(targetPage, 2);
});

test('read-only table handles nulls, fallback names and long plain text with guarded profile links', () => {
  const Link = ({ to, children }) => require('react').createElement('a', { href: to }, children);
  const { ClientTable } = load('src/admin/clients/ClientTable.tsx', {
    'react-router': { Link, useLocation: () => ({ pathname: '/admin/clients', search: '?search=example&page=2' }) },
    '../../i18n/i18n': i18n, '../overview/model': { overviewDate: (_value, _lang, fallback) => fallback },
    './model': model, '../corporate-requests/CorporateRequestsPage.module.css': {}, './ClientsPage.module.css': {},
  });
  const first = { ...fixture(1), full_name: ' ', display_name: 'Synthetic fallback', company_name: '<script>synthetic</script>' + 'x'.repeat(1500), bin: '000000000000' };
  const second = { ...fixture(2), full_name: null, display_id: null };
  const element = ClientTable({ rows: [first, second] });
  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('Synthetic fallback')); assert.ok(html.includes('000000000000'));
  assert.ok(html.includes('&lt;script&gt;synthetic&lt;/script&gt;'));
  assert.ok(html.includes('adminClients.notSpecified'));
  assert.equal(/<button[\s>]|<script>/.test(html), false);
  const links = nodes(element).filter(node => node.type === Link);
  assert.deepEqual(links.map(node => node.props.to), [first, second].map(row => `/admin/clients/${row.id}`));
  links.forEach(node => assert.equal(node.props.state.returnTo, '/admin/clients?search=example&page=2'));
  nodes(element).filter(node => node.type === 'tr').forEach(node => assert.equal(node.props.onClick, undefined));
  assert.equal(model.clientName(second, 'fallback'), 'fallback');
  assert.equal(model.isClientRow(first), true);
});

test('page stores filters/page in URL and resets page on applying or clearing filters', () => {
  let latest;
  const params = new URLSearchParams('search=old&display_id=1&page=3');
  const { ClientsPage } = load('src/admin/clients/ClientsPage.tsx', {
    'react-router': { useSearchParams: () => [params, next => { latest = next; }] }, '../../i18n/i18n': i18n,
    './access': { clientsAccessConfigured: () => false }, './ClientFilters': { ClientFilters: 'ClientFilters' }, './ClientResults': { ClientResults: 'ClientResults' },
    './model': model, '../corporate-requests/CorporateRequestsPage.module.css': {},
  });
  const elements = nodes(ClientsPage());
  const filters = elements.find(node => node.type === 'ClientFilters');
  assert.equal(filters.props.disabled, true);
  filters.props.onApply({ search: 'new', displayId: '2' }); assert.equal(latest.toString(), 'search=new&display_id=2&page=1');
  filters.props.onReset(); assert.equal(latest.toString(), 'page=1');
  elements.find(node => node.type === 'ClientResults').props.onPage(4);
  assert.equal(latest.toString(), 'search=old&display_id=1&page=4');
});

test('three dictionaries match and client list/card routes stay behind one RequireAdmin', () => {
  const keys = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? keys(value, prefix + key + '.') : [prefix + key]).sort();
  const dicts = ['ru', 'kk', 'en'].map(lang => JSON.parse(readFileSync(new URL(`../src/i18n/adminClients.${lang}.json`, import.meta.url))));
  assert.deepEqual(keys(dicts[0]), keys(dicts[1])); assert.deepEqual(keys(dicts[0]), keys(dicts[2]));
  assert.equal(dicts[0].unconfigured.title, 'Административный доступ к списку клиентов не настроен');
  const routes = readFileSync(new URL('../src/routes/admin.tsx', import.meta.url), 'utf8');
  assert.equal((routes.match(/element: <RequireAdmin/g) ?? []).length, 1);
  assert.ok(routes.indexOf("path: 'clients'") > routes.indexOf('element: <RequireAdmin'));
  assert.ok(routes.indexOf("path: 'clients/:id'") > routes.indexOf('element: <RequireAdmin'));
});

test('filter form rejects invalid numbers, trims valid filters and cannot apply while unconfigured', () => {
  let applied = null, resets = 0;
  const { ClientFilters } = load('src/admin/clients/ClientFilters.tsx', {
    react: { useState: value => [value, () => {}] }, '../../design-system': { Alert: 'Alert', Button: 'Button', TextField: 'TextField' },
    '../../i18n/i18n': i18n, './model': model, '../corporate-requests/CorporateRequestsPage.module.css': {},
  });
  const props = { initial: { search: ' Synthetic ', displayId: ' 8 ' }, disabled: true, onApply: value => { applied = value; }, onReset: () => { resets++; } };
  ClientFilters(props).props.onSubmit({ preventDefault() {} }); assert.equal(applied, null);
  ClientFilters({ ...props, disabled: false, initial: { search: '', displayId: 'oops' } }).props.onSubmit({ preventDefault() {} });
  assert.equal(applied, null);
  const enabled = ClientFilters({ ...props, disabled: false });
  enabled.props.onSubmit({ preventDefault() {} }); assert.deepEqual(plain(applied), { search: 'Synthetic', displayId: '8' });
  nodes(enabled).find(node => node.type === 'Button' && node.props.children === 'adminClients.reset').props.onClick();
  assert.equal(resets, 1);
});
