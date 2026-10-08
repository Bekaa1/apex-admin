import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url), root = 'src/admin/stores/requests/';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function load(path, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, URLSearchParams, TextEncoder, AbortSignal, console: { warn() {}, error() {} }, ...globals, require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name in modules) return modules[name];
      throw new Error('Unexpected dependency: ' + name);
    } }, { filename: path });
  return exports;
}
const stores = load('src/admin/stores/model.ts');
const wizard = load('src/admin/stores/onboarding/model.ts', { '../model': stores });
const errors = load('src/admin/stores/onboarding/errors.ts', { './model': wizard });
const model = load(root + 'model.ts', { '../model': stores, '../onboarding/model': wizard });
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const row = (extra = {}) => ({ id: id(1), revision: 3, name: 'Example store', city: 'Алматы', address: 'Example street 1', status: 'inactive', has_plan: true,
  zone_count: 1, is_mine: true, updated_at: '2026-10-07T12:00:00Z', submitted_at: null, published_store_id: null, review_comment: null,
  timezone: null, partner_id: null, proposed_store_id: id(8), reviewed_at: null, created_at: '2026-10-07T10:00:00Z', ...extra });
const normalized = (extra = {}) => model.normalizeRows([row(extra)], () => {}).rows[0];
const data = (rows = [row()]) => model.normalizeRows(rows, () => {});
function translator(lang = 'ru') {
  const dict = Object.fromEntries(['adminStoreRequests', 'adminStoreRequest'].map(name => [name, JSON.parse(read(`src/i18n/${name}.${lang}.json`))]));
  return (key, values = {}) => Object.entries(values).reduce((text, [k, v]) => text.replaceAll('{' + k + '}', String(v)), key.split('.').reduce((obj, k) => obj?.[k], dict) ?? key);
}
test('adapter normalizes nullable text/dates/IDs centrally and keeps zero zones and false flags', () => {
  const result = model.normalizeRows([row({ name: null, city: null, address: null, updated_at: null, review_comment: null, zone_count: 0, has_plan: false, is_mine: false })], () => {});
  assert.equal(result.rows.length, 1); assert.equal(result.skipped, 0);
  const r = result.rows[0]; assert.equal(r.name, ''); assert.equal(r.city, ''); assert.equal(r.address, ''); assert.equal(r.reviewComment, '');
  assert.equal(r.updatedAt, null); assert.equal(r.submittedAt, null); assert.equal(r.publishedStoreId, null); assert.equal(r.zoneCount, 0); assert.equal(r.hasPlan, false); assert.equal(r.isMine, false);
});
test('malformed rows and duplicate IDs are skipped individually, diagnostics omit all record values', () => {
  const reports = [];
  const rows = [row(), row({ id: id(2), name: 12, city: 'PRIVATE', zone_count: null }), null, row({ id: id(3), updated_at: 'bad-date' }), row(), row({ id: id(4) })];
  const result = model.normalizeRows(rows, issue => reports.push(issue));
  assert.equal(result.rows.length, 2); assert.equal(result.received, 6); assert.equal(result.skipped, 4);
  assert.deepEqual(plain(reports), [{ index: 1, fields: ['name', 'zone_count'] }, { index: 2, fields: ['row'] }, { index: 3, fields: ['updated_at'] }, { index: 4, fields: ['id'] }]);
  assert.doesNotMatch(JSON.stringify(reports), /PRIVATE|00000000|Example/);
  assert.throws(() => model.normalizeRows({}, () => {}), /invalid_response/);
});
test('all four statuses and unknown statuses remain visible with independent badge tones', () => {
  const result = model.normalizeRows([...model.STATUSES, 'future_status'].map((status, i) => row({ id: id(i + 1), status })), () => {});
  assert.equal(result.rows.length, 5);
  assert.deepEqual(plain(model.STATUSES.map(s => model.statusTone(s))), ['neutral', 'warning', 'success', 'danger']);
  assert.equal(model.statusTone('future_status'), 'neutral');
});
test('continue priority uses store fields, plan and zone count; readonly always opens review', () => {
  for (const status of ['inactive', 'rejected']) {
    for (const field of ['name', 'city', 'address']) assert.equal(model.nextStep(normalized({ status, [field]: '  ', has_plan: false, zone_count: 0 })), 'details');
    assert.equal(model.nextStep(normalized({ status, has_plan: false, zone_count: 0 })), 'plan');
    assert.equal(model.nextStep(normalized({ status, zone_count: 0 })), 'zoning');
    assert.equal(model.nextStep(normalized({ status })), 'review');
    assert.equal(model.requestAction(normalized({ status })).label, 'continue');
    assert.equal(model.requestAction(normalized({ status, is_mine: false, name: null })).label, 'open');
    assert.match(model.requestAction(normalized({ status, is_mine: false })).href, /step=review$/);
  }
  assert.equal(model.requestAction(normalized({ status: 'pending_owner_approval' })).label, 'open');
  assert.equal(model.requestAction(normalized({ status: 'future_status' })).label, 'open');
});
test('approved requests use a validated published store link, otherwise open their review', () => {
  assert.deepEqual(plain(model.requestAction(normalized({ status: 'approved', published_store_id: id(7) }))), { label: 'openStore', href: '/admin/stores/' + id(7) });
  assert.equal(model.requestAction(normalized({ status: 'approved' })).href, wizard.requestPath(id(1), 'review'));
  assert.equal(model.normalizeRows([row({ published_store_id: 'javascript:bad' })], () => {}).skipped, 1);
});
test('case-insensitive local search covers name/city/address and treats punctuation literally', () => {
  const rows = [normalized(), normalized({ id: id(2), name: 'Case (Name),*', city: null, address: null })];
  for (const q of ['example STORE', 'АЛМАТЫ', 'STREET 1']) assert.equal(model.searchRows(rows, q)[0].id, id(1));
  assert.equal(model.searchRows(rows, '(NAME),*')[0].id, id(2)); assert.equal(model.searchRows(rows, 'missing').length, 0);
  assert.equal(model.searchRows(rows, ' ').length, 2);
});
test('URL status, search and local page survive navigation; invalid filters never become RPC params', () => {
  for (const status of ['', ...model.STATUSES]) {
    const params = model.selectionParams(status, 'A&B', 3), result = model.readSelection(params);
    assert.equal(result.status, status); assert.equal(result.search, 'A&B'); assert.equal(result.page, 3); assert.equal(result.invalid, false);
    assert.equal(model.readSelection(model.selectionParams(status, 'new search')).page, 1);
  }
  for (const q of ['status=unknown', 'status=inactive&status=rejected', 'page=0', 'page=-2', 'page=1.2', 'page=9007199254740992', 'search=' + 'x'.repeat(257)]) assert.equal(model.readSelection(new URLSearchParams(q)).invalid, true);
});
function backend(response) {
  const calls = [], logs = [];
  const client = { requireSupabase: () => ({ rpc(name, args) { calls.push({ name, args }); return { abortSignal(signal) { assert.ok(signal); return response instanceof Error ? Promise.reject(response) : Promise.resolve(response); } }; } }) };
  const readApi = load('src/admin/stores/onboarding/api.ts', { '../../../lib/supabase': client, '../model': stores, './model': wizard, './errors': errors });
  const api = load(root + 'api.ts', { '../../../lib/supabase': client, '../onboarding/api': readApi, '../onboarding/errors': errors, './model': model }, { console: { warn: (...args) => logs.push(args) } });
  return { ...api, calls, logs };
}
test('RPC sends exactly p_status or no status key; no creation, ranges or writes for local pages', async () => {
  for (const status of ['', ...model.STATUSES]) {
    const mock = backend({ data: [row()], error: null }); const result = await mock.fetchRequests(status);
    assert.equal(result.rows.length, 1); assert.deepEqual(plain(mock.calls), [{ name: 'admin_list_store_requests', args: status ? { p_status: status } : {} }]);
  }
  const invalid = backend({ data: [], error: null }); await assert.rejects(invalid.fetchRequests('bad')); assert.equal(invalid.calls.length, 0);
});
test('permission, authentication, network and invalid-envelope errors stay errors; bad row stays a warning', async () => {
  for (const [error, kind] of [[{ code: '42501', message: 'private' }, 'forbidden'], [{ message: 'forbidden' }, 'forbidden'], [{ message: 'not_authenticated' }, 'not_authenticated']]) {
    await assert.rejects(backend({ data: null, error }).fetchRequests(''), e => e.kind === kind);
  }
  await assert.rejects(backend(new Error('offline')).fetchRequests(''), e => e.kind === 'unknown');
  await assert.rejects(backend({ data: null, error: null }).fetchRequests(''), e => e.kind === 'invalid_response');
  const mixed = backend({ data: [row(), row({ id: id(2), name: 'PRIVATE', has_plan: null })], error: null });
  assert.equal((await mixed.fetchRequests('')).rows.length, 1); assert.doesNotMatch(JSON.stringify(mixed.logs), /PRIVATE|Example|00000000/); assert.match(JSON.stringify(mixed.logs), /has_plan/);
});
test('cache scopes by admin and status; search/page reuse data, remount refreshes and no polling/retries', () => {
  let user = 'admin-a', selection;
  const { useStoreRequests } = load(root + 'useStoreRequests.ts', { '@tanstack/react-query': { useQuery: options => options },
    '../../../auth/useAuthSession': { useAuthSession: () => ({ status: 'ready', session: user ? { user: { id: user } } : null }) }, './api': { fetchRequests() { throw new Error('must not run during render'); } } });
  selection = model.readSelection(new URLSearchParams('status=inactive')); const a = useStoreRequests(selection);
  const b = useStoreRequests({ ...selection, search: 'new', page: 2 }); assert.deepEqual(plain(a.queryKey), plain(b.queryKey));
  assert.equal(a.refetchOnMount, 'always'); assert.equal(a.refetchOnWindowFocus, false); assert.equal(a.refetchOnReconnect, false); assert.equal(a.retry, false); assert.equal(a.refetchInterval, undefined);
  user = 'admin-b'; assert.notDeepEqual(plain(a.queryKey), plain(useStoreRequests(selection).queryKey));
  user = null; assert.equal(useStoreRequests(selection).enabled, false); assert.equal(useStoreRequests({ ...selection, invalid: true }).enabled, false);
});
function nodes(value) { return !value || typeof value !== 'object' ? [] : [value, ...[value.props?.children].flat(Infinity).flatMap(nodes)]; }
function pageFixture(query = { data: data() }, search = '') {
  const changes = []; let reloads = 0;
  const { StoreRequestsPage } = load(root + 'StoreRequestsPage.tsx', {
    'react-router': { useSearchParams: () => [new URLSearchParams(search), (...args) => changes.push(args)] },
    '../../../design-system': { Alert: 'Alert', Button: 'Button', Skeleton: 'Skeleton', TextField: 'TextField' },
    '../../../i18n/i18n': { useI18n: () => ({ t: translator() }) }, '../onboarding/errors': errors, '../onboarding/model': wizard, './model': model,
    './useStoreRequests': { useStoreRequests: () => ({ refetch() { reloads++; }, ...query }) }, './StoreRequestRows': { StoreRequestRows: 'Rows' }, './StoreRequests.module.css': {},
  });
  return { tree: StoreRequestsPage(), changes, get reloads() { return reloads; } };
}
test('page states separate loading, empty, no matches, damaged rows and denied/error; retry is explicit', () => {
  const pending = pageFixture({ isPending: true }); assert.equal(nodes(pending.tree).filter(n => n.type === 'Rows').length, 0); assert.ok(nodes(pending.tree).some(n => n.type === 'Skeleton'));
  assert.match(JSON.stringify(pageFixture({ data: data([]) }).tree), /Заявок пока нет/);
  assert.match(JSON.stringify(pageFixture({ data: data() }, 'search=missing').tree), /По выбранным фильтрам/);
  assert.match(JSON.stringify(pageFixture({ data: data([null]) }).tree), /не удалось прочитать/);
  for (const kind of ['forbidden', 'not_authenticated', 'unknown']) {
    const f = pageFixture({ isError: true, error: new errors.RequestFailure(kind), data: data() });
    assert.equal(nodes(f.tree).filter(n => n.type === 'Rows').length, 0); const alert = nodes(f.tree).find(n => n.type === 'Alert'); assert.ok(alert);
    if (kind === 'not_authenticated') assert.equal(alert.props.action.props.href, '/login'); else { alert.props.action.props.onClick(); assert.equal(f.reloads, 1); }
  }
});
test('status/search reset local page; manual refresh and next page do not create requests', () => {
  const f = pageFixture({ data: data(Array.from({ length: 30 }, (_, i) => row({ id: id(i + 1) }))) }, 'page=2');
  assert.equal(nodes(f.tree).find(n => n.type === 'Rows').props.rows.length, 5);
  nodes(f.tree).find(n => n.type === 'select').props.onChange({ target: { value: 'rejected' } }); assert.equal(f.changes[0][0].get('status'), 'rejected'); assert.equal(f.changes[0][0].get('page'), null);
  nodes(f.tree).find(n => n.type === 'TextField').props.onChange({ target: { value: 'abc' } }); assert.equal(f.changes[1][0].get('search'), 'abc'); assert.equal(f.changes[1][0].get('page'), null);
  const create = nodes(f.tree).find(n => n.type === 'Button' && n.props.href === wizard.requestPath(undefined)); assert.ok(create); assert.equal(create.props.onClick, undefined);
  nodes(f.tree).find(n => n.type === 'Button' && n.props.children === 'Обновить').props.onClick(); assert.equal(f.reloads, 1);
});
test('table/cards escape text, render nullable fallbacks, owner comments and correct links in every language', () => {
  for (const lang of ['ru', 'kk', 'en']) {
    const { StoreRequestRows } = load(root + 'StoreRequestRows.tsx', {
      '../../../design-system': { Badge: ({ children }) => React.createElement('span', {}, children), Button: ({ children, href }) => React.createElement('a', { href }, children) },
      '../../../i18n/i18n': { useI18n: () => ({ t: translator(lang), lang }) }, '../onboarding/model': wizard, './model': model, './StoreRequests.module.css': {},
    });
    const rows = model.normalizeRows([row({ name: null, city: null, address: null, status: 'rejected', review_comment: '<script>owner</script>\nSecond line' }), row({ id: id(2), status: 'approved', published_store_id: id(7), name: 'X'.repeat(400), is_mine: false })], () => {}).rows;
    const html = renderToStaticMarkup(React.createElement(StoreRequestRows, { rows }));
    assert.doesNotMatch(html, /<script>|adminStoreRequests\./); assert.match(html, /&lt;script&gt;/); assert.match(html, /<table/); assert.match(html, /<dl/); assert.match(html, /\/admin\/stores\/00000000-0000-4000-8000-000000000007/);
    assert.ok(html.includes(translator(lang)('adminStoreRequests.unnamed'))); assert.ok(html.includes(translator(lang)('adminStoreRequests.mine')));
  }
});
test('unique protected route, adjacent menu item, return from wizard and completed success link', () => {
  const routes = read('src/routes/admin.tsx'); const rootIndex = routes.indexOf("path: '/admin', element: <RequireAdmin"); const listIndex = routes.indexOf("path: 'store-requests'");
  assert.ok(listIndex > rootIndex && listIndex < routes.indexOf("path: '*', element: <AdminNotFound")); assert.equal(routes.split("path: 'store-requests'").length - 1, 1);
  const sections = load('src/admin/sections.ts'); assert.equal(sections.adminSectionFor('/admin/store-requests').labelKey, 'adminStoreRequests.title');
  assert.equal(sections.ADMIN_SECTIONS.findIndex(s => s.path === '/admin/store-requests'), sections.ADMIN_SECTIONS.findIndex(s => s.path === '/admin/stores') + 1);
  for (const path of ['StoreRequestPage.tsx', 'StoreRequestForm.tsx']) assert.match(read('src/admin/stores/onboarding/' + path), /href=\{STORE_REQUEST_LIST\}/);
  assert.match(read('src/admin/stores/onboarding/review/StoreReviewStep.tsx'), /backTo = STORE_REQUEST_LIST/);
  assert.match(read('src/admin/stores/onboarding/review/StoreReviewStep.tsx'), /href=\{backTo\}/);
  assert.doesNotMatch(read('src/admin/stores/onboarding/review/StoreReviewStep.tsx'), /listPending/);
  for (const path of ['api.ts', 'StoreRequestsPage.tsx', 'useStoreRequests.ts']) assert.doesNotMatch(read(root + path), /admin_create_store_request|owner_approve_store_request|owner_reject_store_request|\.from\(|\.insert\(|\.delete\(/);
});
