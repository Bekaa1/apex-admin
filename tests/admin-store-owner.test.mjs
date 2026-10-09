import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Only explicitly supplied local modules. No env, live Supabase client or network.
const require = createRequire(import.meta.url), root = 'src/admin/stores/owner/';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function load(path, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, TextEncoder, AbortSignal, console: { error() {}, warn() {} }, ...globals, require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name.endsWith('/statusTone')) return load('src/admin/statusTone.ts', {});
      if (name in modules) return modules[name];
      throw new Error('Unexpected dependency: ' + name);
    } }, { filename: path });
  return exports;
}
const stores = load('src/admin/stores/model.ts');
const wizard = load('src/admin/stores/onboarding/model.ts', { '../model': stores });
const errors = load('src/admin/stores/onboarding/errors.ts', { './model': wizard });
const list = load('src/admin/stores/requests/model.ts', { '../model': stores, '../onboarding/model': wizard });
const model = load(root + 'model.ts', { '../model': stores, '../requests/model': list });
const plan = load('src/admin/stores/onboarding/plan/model.ts');
const review = load('src/admin/stores/onboarding/review/model.ts', { '../model': wizard, '../plan/model': plan });
const access = load('src/auth/adminAccess.ts');
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const record = extra => ({ id: id(1), revision: 4, status: 'pending_owner_approval', is_mine: false, name: 'Synthetic', city: 'Example', address: 'Example 1', timezone: 'Asia/Almaty',
  submitted_at: '2026-10-07T12:00:00Z', review_comment: null, published_store_id: null, plan: { plan_data: plain(plan.EXAMPLE_PLAN), source_file_name: 'synthetic.json' },
  zones: [{ id: id(7), client_id: 'zone-one', name: 'Synthetic zone', color: '#22AA55', sort_order: 0 }], assignments: [{ element_id: 'A-1', zone_id: id(7) }], ...extra });
const row = extra => ({ ...record(), updated_at: '2026-10-07T12:00:00Z', zone_count: 1, has_plan: true, ...extra });
const approved = () => record({ status: 'approved', revision: 5, published_store_id: id(8) });
const rejected = () => record({ status: 'rejected', revision: 5, review_comment: 'Synthetic comment' });
const envelope = r => ({ request: r, plan: r.plan, zones: r.zones, assignments: r.assignments });
const ok = data => ({ data, error: null });
const fail = (message, hint) => ({ data: null, error: { code: 'P0001', message, hint, details: 'PRIVATE' } });
function backend(responses) {
  const calls = [], returned = [];
  const supabase = { requireSupabase: () => ({ rpc(name, args) { calls.push({ name, args }); return { abortSignal(signal) {
    assert.ok(signal); const response = responses.shift(); return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  } }; } }) };
  const api = load('src/admin/stores/onboarding/api.ts', { '../../../lib/supabase': supabase, '../model': stores, './model': wizard, './errors': errors });
  const write = load(root + 'api.ts', { '../../../lib/supabase': supabase, '../model': stores, '../onboarding/api': api, '../onboarding/errors': errors, './model': model });
  const decide = load(root + 'decide.ts', { '../onboarding/api': api, '../onboarding/errors': errors, './model': model, './api': write });
  return { calls, returned, ...write, ...decide, run: (decision = 'approve', r = record(), owner = true, comment = '  Synthetic comment  ') => decide.decideRequest(owner, r, decision, comment, result => returned.push(result)) };
}
function translator(lang = 'ru') {
  const dict = Object.fromEntries(['adminStoreOwner', 'adminStoreRequests', 'adminStoreRequest', 'adminStoreReview', 'adminStoreZoning'].map(name => [name, JSON.parse(read(`src/i18n/${name}.${lang}.json`))]));
  return (key, values = {}) => Object.entries(values).reduce((text, [k, v]) => text.replaceAll('{' + k + '}', String(v)), key.split('.').reduce((obj, k) => obj?.[k], dict) ?? key);
}
const nodes = value => !value || typeof value !== 'object' ? [] : [value, ...[value.props?.children].flat(Infinity).flatMap(nodes)];
const button = (tree, text) => nodes(tree).find(n => n.type === 'Button' && n.props.children === text);
const tick = () => new Promise(resolve => setImmediate(resolve));
function hookState() {
  const cells = []; let index = 0;
  return { reset() { index = 0; }, hooks: {
    useState(initial) { const i = index++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], next => { cells[i] = typeof next === 'function' ? next(cells[i]) : next; }]; },
    useRef(value) { const i = index++; cells[i] ??= { current: value }; return cells[i]; }, useEffect(fn) { fn(); }, useId: () => 'synthetic-title',
  } };
}

test('owner permission uses exact RPC, strict true, user/session cache key, error closes stale access', async () => {
  let opts, response = ok(true), rpcArgs;
  const permission = load('src/auth/useStoreOwnerAccess.ts', {
    '@tanstack/react-query': { useQuery(value) { opts = value; return { data: true, isError: true, isPending: false, isFetching: false }; } },
    '../lib/supabase': { supabase: {}, requireSupabase: () => ({ rpc(...args) { rpcArgs = args; return { abortSignal: () => Promise.resolve(response) }; } }) },
    './adminAccess': access, './useAuthSession': { useAuthSession: () => ({ status: 'ready', session: { user: { id: 'synthetic-user' }, expires_at: 900 } }) },
  });
  assert.equal(permission.useStoreOwnerAccess().access, 'error'); assert.equal(opts.retry, false); assert.equal(opts.gcTime, 0);
  assert.deepEqual(plain(opts.queryKey), ['admin', 'store-owner-access', 'synthetic-user', 900]);
  assert.equal(await opts.queryFn({ signal: new AbortController().signal }), true); assert.deepEqual(rpcArgs, ['is_apex_store_owner']);
  for (const value of [false, null, 'true', 1]) { response = ok(value); assert.equal(await opts.queryFn({ signal: new AbortController().signal }), false); }
  response = fail('forbidden'); await assert.rejects(opts.queryFn({ signal: new AbortController().signal }));
});
test('owner guard never mounts protected pages on loading, false, errors or no configuration', () => {
  let state = 'denied';
  const { RequireStoreOwner } = load('src/auth/RequireStoreOwner.tsx', {
    'react-router': { Navigate: 'Navigate', Outlet: 'Outlet' }, '../design-system': { Alert: 'Alert', Button: 'Button', Skeleton: 'Skeleton' },
    '../i18n/i18n': { useI18n: () => ({ t: translator() }) }, '../admin/stores/onboarding/errors': errors,
    './useStoreOwnerAccess': { useStoreOwnerAccess: () => ({ access: state, query: { error: new Error('offline'), refetch() {} } }) },
  });
  for (state of ['denied', 'error', 'loading', 'unconfigured', 'signedOut']) assert.ok(!nodes(RequireStoreOwner()).some(n => n.type === 'Outlet'));
  state = 'allowed'; assert.equal(RequireStoreOwner().type, 'Outlet'); assert.equal(RequireStoreOwner().props.context.owner, true);
});
test('queue entry hidden for non-owner and errors; existing admin list stays available', () => {
  let state = 'denied';
  const { StoreRequestsHome } = load(root + 'StoreRequestsHome.tsx', {
    '../../../design-system': { Alert: 'Alert', Button: 'Button' }, '../../../i18n/i18n': { useI18n: () => ({ t: translator() }) },
    '../../../auth/useStoreOwnerAccess': { useStoreOwnerAccess: () => ({ access: state, query: { refetch() {} } }) },
    '../requests/StoreRequestsPage': { StoreRequestsPage: 'AdminList' }, './model': model,
  });
  for (state of ['denied', 'error', 'loading']) { const n = nodes(StoreRequestsHome()); assert.ok(n.some(n => n.type === 'AdminList')); assert.ok(!n.some(n => n.props?.href === model.OWNER_QUEUE)); }
  state = 'allowed'; assert.ok(nodes(StoreRequestsHome()).some(n => n.props?.href === model.OWNER_QUEUE));
});
test('queue adapter accepts nulls, sorts oldest first, excludes other statuses and skips only damaged rows', () => {
  const reports = [], data = model.normalizeQueue([row({ id: id(2), submitted_at: '2026-10-07T13:00:00Z' }), row({ name: null, city: null, address: null, timezone: null }),
    row({ id: id(3), status: 'approved' }), row({ id: id(4), timezone: 7 })], issue => reports.push(issue));
  assert.equal(data.rows.length, 2); assert.equal(data.rows[0].id, id(1)); assert.equal(data.rows[0].timezone, ''); assert.equal(data.rows[0].name, ''); assert.equal(data.skipped, 1);
  assert.deepEqual(plain(reports), [{ index: 3, fields: ['timezone'] }]); assert.equal(model.normalizeQueue([], () => {}).rows.length, 0);
  assert.throws(() => model.normalizeQueue({}, () => {}));
});
test('queue calls argument-free RPC; no direct profiles, IDs or email requests', async () => {
  const mock = backend([ok([row()])]); const result = await mock.getOwnerQueue(); assert.equal(result.rows.length, 1);
  assert.equal(mock.calls.length, 1); assert.equal(mock.calls[0].name, 'owner_list_pending_store_requests'); assert.equal(mock.calls[0].args, undefined);
});
test('approve uses only expected RPC arguments, keeps returned store ID and reads canonical record', async () => {
  const mock = backend([ok(id(8)), ok(envelope(approved()))]); const result = await mock.run();
  assert.equal(result.outcome, 'approved'); assert.deepEqual(plain(mock.returned), [{ storeId: id(8) }]);
  assert.deepEqual(plain(mock.calls), [{ name: 'owner_approve_store_request', args: { p_id: id(1), p_expected_revision: 4 } }, { name: 'get_store_request', args: { p_id: id(1) } }]);
});
test('reject trims required comment, keeps revision, then displays stored comment', async () => {
  const mock = backend([ok(5), ok(envelope(rejected()))]); const result = await mock.run('reject');
  assert.equal(result.outcome, 'rejected'); assert.equal(result.record.review_comment, 'Synthetic comment'); assert.deepEqual(plain(mock.returned), [{ revision: 5 }]);
  assert.deepEqual(plain(mock.calls[0]), { name: 'owner_reject_store_request', args: { p_id: id(1), p_expected_revision: 4, p_comment: 'Synthetic comment' } });
});
test('not owner, non-pending status and invalid comment cannot call a mutation', async () => {
  for (const r of [approved(), rejected(), record({ status: 'inactive' })]) { const b = backend([]); await assert.rejects(b.run('approve', r)); assert.equal(b.calls.length, 0); }
  const b = backend([]); await assert.rejects(b.run('approve', record(), false), e => e.kind === 'forbidden'); assert.equal(b.calls.length, 0);
  for (const comment of ['', '  a ', ' ab ', 'x'.repeat(1001)]) { const b = backend([]); await assert.rejects(b.run('reject', record(), true, comment), e => e.hint === 'comment'); assert.equal(b.calls.length, 0); }
  assert.equal(model.validComment(' abc '), true); assert.equal(model.validComment('x'.repeat(1000)), true);
});
test('unknown approve outcome rereads; confirmed publication succeeds without retry', async () => {
  const b = backend([new Error('offline'), ok(envelope(approved()))]); assert.equal((await b.run()).outcome, 'approved'); assert.equal(b.calls.length, 2);
});
test('pending after unknown approval permits a separate manual retry with refreshed revision', async () => {
  const b = backend([new Error('timeout'), ok(envelope(record({ revision: 6 }))), ok(id(8)), ok(envelope(approved()))]);
  const first = await b.run(); assert.equal(first.outcome, 'pending'); assert.equal(b.calls.length, 2);
  assert.equal((await b.run('approve', first.record)).outcome, 'approved'); assert.equal(b.calls[2].args.p_expected_revision, 6);
});
test('unknown rejection rereads and never automatically repeats', async () => {
  for (const [fresh, outcome] of [[rejected(), 'rejected'], [record(), 'pending'], [approved(), 'changed']]) {
    const b = backend([new Error('offline'), ok(envelope(fresh))]); assert.equal((await b.run('reject')).outcome, outcome); assert.equal(b.calls.length, 2);
  }
});
test('read failure after a decision blocks further decisions until a manual read resolves it', async () => {
  const b = backend([ok(id(8)), new Error('offline'), ok(envelope(approved()))]);
  await assert.rejects(b.run(), e => e.kind === 'unresolved'); assert.deepEqual(plain(b.returned), [{ storeId: id(8) }]);
  assert.equal((await b.readDecision(id(1), 'approve')).outcome, 'approved'); assert.equal(b.calls.filter(c => c.name === 'owner_approve_store_request').length, 1);
});
test('revision conflict, concurrent decision and already_published refresh without a second mutation', async () => {
  for (const code of ['revision_conflict', 'invalid_status', 'already_published']) {
    const b = backend([fail(code), ok(envelope(rejected()))]); const result = await b.run(); assert.equal(result.outcome, 'changed'); assert.equal(result.reason, code);
    assert.equal(result.record.status, 'rejected'); assert.equal(b.calls.length, 2); assert.equal(model.canDecide(true, result.record), false);
  }
});
test('server errors map to safe labels, comment hint and permission SQLSTATE are preserved', async () => {
  for (const code of ['owner_not_configured', 'forbidden', 'not_authenticated', 'not_found', 'invalid_store', 'invalid_plan', 'invalid_zones', 'invalid_assignments']) {
    const b = backend([fail(code, code === 'invalid_store' ? 'comment' : '')]); await assert.rejects(b.run(), e => e.kind === code); assert.equal(b.calls.length, 1);
  }
  assert.equal(errors.failure({ code: '42501' }).kind, 'forbidden'); assert.equal(errors.failure({ message: 'invalid_store', hint: 'comment' }).hint, 'comment');
});

function decisionFixture({ value = record(), owner = true, decide, readBack } = {}) {
  const state = hookState(), updates = [], invalidations = [], queue = { rows: [row(), row({ id: id(2) })] }; let options, mutationPending = false;
  const client = { setQueryData(key, next) { updates.push({ key, next }); value = next; }, setQueriesData(_key, fn) { queue.rows = fn(queue).rows; }, invalidateQueries(opts) { invalidations.push(opts); return Promise.resolve(); } };
  const { OwnerDecision } = load(root + 'OwnerDecision.tsx', {
    react: state.hooks, '@tanstack/react-query': { useQueryClient: () => client, useMutation(opts) { options = opts; return { isPending: mutationPending, async mutateAsync(arg) { mutationPending = true; try { return await opts.mutationFn(arg); } finally { mutationPending = false; } } }; } },
    '../../../design-system': { Alert: 'Alert', Button: 'Button' }, '../../../i18n/i18n': { useI18n: () => ({ t: translator(), lang: 'ru' }) },
    '../model': stores, '../onboarding/errors': errors, '../onboarding/model': wizard, '../onboarding/review/StoreReviewStep': { StoreReviewStep: 'Summary' },
    '../onboarding/review/model': review, './model': model,
    './decide': { decideRequest: decide ?? (async () => ({ record: approved(), outcome: 'approved', reason: 'success' })), readDecision: readBack ?? (async () => ({ record: approved(), outcome: 'approved', reason: 'unknown' })) },
    './DecisionDialog': { DecisionDialog: 'Dialog' }, './Owner.module.css': {},
  });
  return { render() { state.reset(); return OwnerDecision({ owner, record: value, userId: 'synthetic-user', onRefresh() {} }); }, updates, invalidations, queue, get options() { return options; } };
}
test('actual owner UI forces read-only preview even for own draft, exposes revision/assignments, hides decisions for nonowner', () => {
  for (const fixture of [decisionFixture({ owner: false }), decisionFixture({ value: rejected() }), decisionFixture({ value: record({ status: 'inactive', is_mine: true }) })]) {
    const tree = fixture.render(); assert.equal(button(tree, 'Одобрить и создать супермаркет'), undefined); assert.equal(button(tree, 'Отклонить'), undefined);
    assert.equal(nodes(tree).find(n => n.type === 'Summary').props.readOnly, true);
  }
  const tree = decisionFixture().render(); assert.ok(button(tree, 'Одобрить и создать супермаркет')); assert.ok(nodes(tree).some(n => n.props?.id === 'owner-assignments'));
});
test('actual UI double confirmation causes one call; success removes queue row and invalidates related lists', async () => {
  let calls = 0, finish;
  const fixture = decisionFixture({ decide: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  let tree = fixture.render(); button(tree, 'Одобрить и создать супермаркет').props.onClick(); tree = fixture.render();
  const dialog = nodes(tree).find(n => n.type === 'Dialog'); dialog.props.onConfirm(); dialog.props.onConfirm();
  assert.equal(calls, 1); assert.equal(fixture.options.retry, false); tree = fixture.render(); assert.equal(button(tree, 'Отклонить').props.disabled, true);
  assert.equal(nodes(tree).find(n => n.type === 'Summary').props.externalBusy, true);
  finish({ record: approved(), outcome: 'approved', reason: 'success' }); await tick(); tree = fixture.render();
  assert.equal(button(tree, 'Одобрить и создать супермаркет'), undefined); assert.equal(fixture.queue.rows.length, 1); assert.equal(fixture.queue.rows[0].id, id(2));
  assert.deepEqual(fixture.invalidations.map(x => x.queryKey[1]), ['store-owner-queue', 'store-requests', 'stores']);
});
test('unresolved UI blocks decision buttons, preserves comment and exposes read-only recheck', async () => {
  const fixture = decisionFixture({ decide: async () => { throw new errors.RequestFailure('unresolved'); } });
  let tree = fixture.render(); button(tree, 'Отклонить').props.onClick(); tree = fixture.render(); nodes(tree).find(n => n.type === 'Dialog').props.onComment('Synthetic comment');
  tree = fixture.render(); nodes(tree).find(n => n.type === 'Dialog').props.onConfirm(); await tick(); tree = fixture.render();
  assert.equal(button(tree, 'Одобрить и создать супермаркет').props.disabled, true); assert.equal(button(tree, 'Отклонить').props.disabled, true);
  const recheck = nodes(tree).find(n => n.type === 'Button' && n.props.children === translator()('adminStoreRequest.recheck')); assert.ok(recheck); recheck.props.onClick(); await tick();
  assert.equal(button(fixture.render(), 'Одобрить и создать супермаркет'), undefined);
});
test('actual rejection dialog requires comment, has production warning, locks both actions and uses native modal focus', () => {
  const { DecisionDialog } = load(root + 'DecisionDialog.tsx', { react: { useEffect() {}, useId: () => 'id', useRef: () => ({ current: null }) }, '../../../design-system': { Button: 'Button' }, '../../../i18n/i18n': { useI18n: () => ({ t: translator() }) }, './model': model, './Owner.module.css': {} });
  const props = { name: 'Synthetic', onComment() {}, onCancel() {}, onConfirm() {} };
  for (const comment of ['', 'ab', 'x'.repeat(1001)]) assert.equal(button(DecisionDialog({ ...props, decision: 'reject', comment, busy: false }), 'Отклонить').props.disabled, true);
  assert.equal(button(DecisionDialog({ ...props, decision: 'reject', comment: ' abc ', busy: false }), 'Отклонить').props.disabled, false);
  const busy = DecisionDialog({ ...props, decision: 'approve', comment: '', busy: true }); assert.ok(nodes(busy).filter(n => n.type === 'Button').every(n => n.props.disabled));
  for (const lang of ['ru', 'kk', 'en']) { const t = translator(lang); assert.match(t('adminStoreOwner.approveWarning'), /production/); }
  const source = read(root + 'DecisionDialog.tsx'); assert.match(source, /showModal\(\)/); assert.match(source, /previous\.focus\(\)/); assert.match(source, /event\.preventDefault\(\)/);
});
test('queue UI handles loading, empty, access error and several nullable/long requests using safe text', () => {
  let query = { isPending: false, isFetching: false, isError: false, data: model.normalizeQueue([], () => {}), refetch() {} };
  const { OwnerQueuePage } = load(root + 'OwnerQueuePage.tsx', { '../../../design-system': { Alert: p => React.createElement('div', null, p.title, p.children, p.action), Badge: 'span', Button: p => React.createElement('a', { href: p.href }, p.children), Skeleton: 'div' },
    '../../../i18n/i18n': { useI18n: () => ({ t: translator(), lang: 'ru' }) }, '../onboarding/errors': errors, '../onboarding/model': wizard, './model': model, './useOwnerQueue': { useOwnerQueue: () => query }, './Owner.module.css': {} });
  const html = () => renderToStaticMarkup(React.createElement(OwnerQueuePage)); assert.match(html(), /Заявок, ожидающих решения, нет/);
  query = { ...query, isPending: true }; assert.match(html(), /aria-busy="true"/); query = { ...query, isPending: false, isError: true, error: new errors.RequestFailure('forbidden') }; assert.match(html(), /Нет права/);
  query = { ...query, isError: false, data: model.normalizeQueue([row({ name: null, timezone: null }), row({ id: id(2), name: '<script>unsafe</script>' + 'x'.repeat(600), is_mine: true })], () => {}) };
  const markup = html(); assert.match(markup, /Без названия/); assert.match(markup, /Моя заявка/); assert.match(markup, /&lt;script&gt;/); assert.doesNotMatch(markup, /<script>/); assert.equal((markup.match(/Рассмотреть/g) ?? []).length, 2);
});
test('routes stay behind both guards, reuse previews and clear access on session changes; no backend writes outside RPC', () => {
  const routes = read('src/routes/admin.tsx'); const admin = routes.indexOf("path: '/admin', element: <RequireAdmin"), owner = routes.indexOf('element: <RequireStoreOwner');
  assert.ok(owner > admin); for (const path of ['store-requests/pending', 'store-requests/:requestId/review']) { assert.ok(routes.indexOf(`path: '${path}'`) > owner); assert.equal(routes.split(`path: '${path}'`).length - 1, 1); }
  const summary = read('src/admin/stores/onboarding/review/StoreReviewStep.tsx'); assert.match(summary, /!readOnly && canEdit/); assert.match(summary, /!check.valid && editable/); assert.match(summary, /<PlanPreview/);
  assert.match(read('src/auth/AuthSessionProvider.tsx'), /queryClient.clear\(\)/); assert.match(read('src/auth/useSignOut.ts'), /queryClient.clear\(\)/);
  for (const path of ['api.ts', 'decide.ts', 'OwnerDecision.tsx', 'OwnerQueuePage.tsx']) assert.doesNotMatch(read(root + path), /\.from\(|\.update\(|\.insert\(|\.delete\(|owner_email|author_user_id|dangerouslySetInnerHTML/);
  assert.doesNotMatch(read('src/auth/useStoreOwnerAccess.ts'), /\.from\(|\.role\s*===/);
});
