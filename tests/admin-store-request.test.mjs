import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { createElement, useId } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// All RPCs and browser storage are in-memory doubles. No env, network or production writes.
const require = createRequire(import.meta.url);
const dir = 'src/admin/stores/onboarding/';
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function load(path, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, URLSearchParams, AbortSignal, console: { error() {} }, ...globals, require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name in modules) return modules[name];
      throw new Error('Unexpected dependency: ' + name);
    } }, { filename: path });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const stores = load('src/admin/stores/model.ts');
const model = load(dir + 'model.ts', { '../model': stores });
const errorLog = [];
const errors = load(dir + 'errors.ts', { './model': model }, { console: { error: (...args) => errorLog.push(args) } });
const attemptModule = load(dir + 'attempt.ts', { '../model': stores, './model': model, './errors': errors });
const id = '00000000-0000-4000-8000-000000000001';
const key = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const fields = { name: 'Synthetic store', city: 'Example city', address: 'Example address', timezone: 'Asia/Almaty' };
const record = overrides => ({ ...fields, id, revision: 1, status: 'inactive', is_mine: true, review_comment: null, published_store_id: null, ...overrides });
function memory() {
  const values = new Map();
  return { getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value), removeItem: name => values.delete(name), values };
}
function attempts(storage = memory(), user = 'synthetic-user', uuid = () => key) {
  return attemptModule.createAttemptStore(user, storage, uuid);
}
function backend(responses) {
  const calls = [];
  const api = load(dir + 'api.ts', {
    '../../../lib/supabase': { requireSupabase: () => ({ rpc(name, args) {
      calls.push({ name, args });
      return { abortSignal(signal) {
        assert.ok(signal); const response = responses.shift();
        return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
      } };
    } }) }, '../model': stores, './model': model, './errors': errors,
  });
  return { api, calls };
}
function saver(api) { return load(dir + 'save.ts', { './api': api, './model': model, './errors': errors }).saveDetails; }

test('trimmed validation: draft versus continue; exact length boundaries and timezone', () => {
  assert.deepEqual(plain(model.validate({ ...fields, name: '  Ab  ', city: ' ', address: ' ' }, false)), {});
  assert.deepEqual(plain(model.validate({ ...fields, city: ' ', address: ' ' }, true)), { city: 'required', address: 'required' });
  for (const [field, length] of [['name', 120], ['city', 80], ['address', 200]]) {
    assert.equal(model.validate({ ...fields, [field]: '  ' + 'a'.repeat(length) + '  ' }, true)[field], undefined);
    assert.ok(model.validate({ ...fields, [field]: 'a'.repeat(length + 1) }, true)[field]);
  }
  assert.equal(model.validate({ ...fields, name: ' x ', timezone: ' ' }, true).name, 'nameLength');
  assert.equal(model.validate({ ...fields, timezone: ' ' }, false).timezone, 'required');
  assert.equal(model.EMPTY_FIELDS.timezone, 'Asia/Almaty');
});

test('Json response parsing handles null fields, denies malformed data and preserves unknown status', () => {
  const parsed = model.parseRequest({ request: record({ name: null, city: null, address: null, status: 'future_status' }) }, id);
  assert.equal(parsed.name, ''); assert.equal(parsed.city, ''); assert.equal(parsed.address, '');
  assert.equal(model.canEdit(parsed), false);
  for (const data of [null, {}, { request: null }, { request: record({ id: other }) }, { request: record({ revision: 0 }) },
    { request: record({ is_mine: 'true' }) }, { request: record({ city: 10 }) }, { request: record({ published_store_id: 'bad' }) }]) {
    assert.throws(() => model.parseRequest(data, id));
  }
  for (const status of ['inactive', 'rejected', 'pending_owner_approval', 'approved', 'unknown']) {
    assert.equal(model.canEdit(record({ status })), ['inactive', 'rejected'].includes(status));
    assert.equal(model.canEdit(record({ status, is_mine: false })), false);
  }
});

test('API uses exact public RPC arguments, trimmed fields, no partner and scalar UUID/revision', async () => {
  const mock = backend([{ data: id, error: null }, { data: 2, error: null }, { data: { request: record() }, error: null }]);
  assert.equal(await mock.api.createRequest(key, { ...fields, name: '  Synthetic store  ' }), id);
  assert.equal(await mock.api.updateRequest(id, 1, fields), 2);
  assert.equal((await mock.api.getRequest(id)).id, id);
  assert.deepEqual(plain(mock.calls), [
    { name: 'admin_create_store_request', args: { p_request_key: key, p_name: fields.name, p_city: fields.city, p_address: fields.address, p_timezone: fields.timezone } },
    { name: 'admin_update_store_request', args: { p_id: id, p_expected_revision: 1, p_name: fields.name, p_city: fields.city, p_address: fields.address, p_timezone: fields.timezone } },
    { name: 'get_store_request', args: { p_id: id } },
  ]);
});

test('bad UUID/revision causes no RPC; invalid response does not become a successful save', async () => {
  const mock = backend([]);
  await assert.rejects(mock.api.getRequest('new'));
  await assert.rejects(mock.api.createRequest('bad', fields));
  await assert.rejects(mock.api.updateRequest(id, NaN, fields));
  assert.equal(mock.calls.length, 0);
  await assert.rejects(backend([{ data: { id }, error: null }]).api.createRequest(key, fields), e => e.kind === 'invalid_response');
  await assert.rejects(backend([{ data: 1, error: null }]).api.updateRequest(id, 1, fields), e => e.kind === 'invalid_response');
});

test('creation key survives retries and remounts, is scoped to user, freezes uncertain payload and clears on success', async () => {
  let uuids = 0;
  const storage = memory();
  const first = attempts(storage, 'a', () => { uuids++; return key; });
  assert.equal(first.read(), null); assert.equal(uuids, 0);
  const mock = backend([new Error('Network lost'), { data: id, error: null }]);
  const save = saver(mock.api);
  await assert.rejects(save(null, fields, first));
  assert.equal(first.read().uncertain, true);
  assert.equal(attempts(storage, 'b').read(), null);
  const mountedAgain = attempts(storage, 'a', () => { uuids++; return other; });
  const result = await save(null, { ...fields, name: 'Different input' }, mountedAgain);
  assert.equal(uuids, 1); assert.equal(mock.calls[0].args.p_request_key, mock.calls[1].args.p_request_key);
  assert.equal(mock.calls[1].args.p_name, fields.name); assert.equal(result.record.revision, 1);
  assert.equal(result.created, true); assert.equal(mountedAgain.read().requestId, id);
  mountedAgain.acknowledge(other); assert.equal(mountedAgain.read().requestId, id);
  mountedAgain.acknowledge(id); assert.equal(mountedAgain.read(), null);
  assert.equal(model.requestPath(result.record.id, 'plan'), `/admin/stores/new/${id}?step=plan`);
});

test('confirmed create survives reload before routing without a second creation; next attempt gets a new key', async () => {
  const storage = memory(); let generated = 0;
  const attempt = attempts(storage, 'a', () => { generated++; return generated === 1 ? key : other; });
  const mock = backend([{ data: id, error: null }, { data: { request: record({ revision: 3 }) }, error: null }]);
  await saver(mock.api)(null, fields, attempt);
  const recovered = await saver(mock.api)(null, fields, attempts(storage, 'a'));
  assert.equal(recovered.record.id, id); assert.equal(recovered.record.revision, 3);
  assert.deepEqual(mock.calls.map(c => c.name), ['admin_create_store_request', 'get_store_request']);
  attempt.acknowledge(id); assert.equal(attempt.prepare(fields).key, other); assert.equal(generated, 2);
});

test('known validation rejection allows correction using the same key; unavailable storage fails before write', async () => {
  const attempt = attempts();
  const mock = backend([{ data: null, error: { code: 'P0001', message: 'invalid_store', hint: 'name', details: 'private' } }, { data: id, error: null }]);
  const save = saver(mock.api);
  await assert.rejects(save(null, fields, attempt), e => e.kind === 'invalid_store' && e.field === 'name');
  assert.equal(attempt.read().uncertain, false);
  await save(null, { ...fields, name: 'Corrected store' }, attempt);
  assert.equal(mock.calls[1].args.p_name, 'Corrected store'); assert.equal(mock.calls[1].args.p_request_key, key);
  const blocked = attempts({ getItem() { return null; }, setItem() { throw new Error(); }, removeItem() {} });
  const unused = backend([]);
  await assert.rejects(saver(unused.api)(null, fields, blocked), e => e.kind === 'storage');
  assert.equal(unused.calls.length, 0);
});

test('update returns new revision; conflict reloads without repeating update; all read-only statuses refuse writes', async () => {
  const success = backend([{ data: 2, error: null }]);
  assert.equal((await saver(success.api)(record(), fields, attempts())).record.revision, 2);
  const conflict = backend([{ data: null, error: { code: 'P0001', message: 'revision_conflict', hint: 'revision' } }, { data: { request: record({ revision: 3, name: 'Concurrent edit' }) }, error: null }]);
  const result = await saver(conflict.api)(record(), fields, attempts());
  assert.equal(result.outcome, 'changed'); assert.equal(result.record.revision, 3); assert.equal(result.record.name, 'Concurrent edit');
  assert.deepEqual(conflict.calls.map(call => call.name), ['admin_update_store_request', 'get_store_request']);
  const unused = backend([]);
  for (const status of ['pending_owner_approval', 'approved', 'future']) await assert.rejects(saver(unused.api)(record({ status }), fields, attempts()));
  await assert.rejects(saver(unused.api)(record({ is_mine: false }), fields, attempts()));
  assert.equal(unused.calls.length, 0);
});

test('unknown update result is reconciled by reading; failed read blocks repeated writing', async () => {
  for (const [fresh, expected] of [[record({ revision: 2 }), 'saved'], [record(), 'unchanged'], [record({ revision: 3, name: 'Other' }), 'changed']]) {
    const mock = backend([new Error('Network lost'), { data: { request: fresh }, error: null }]);
    assert.equal((await saver(mock.api)(record(), fields, attempts())).outcome, expected);
    assert.deepEqual(mock.calls.map(call => call.name), ['admin_update_store_request', 'get_store_request']);
  }
  const unknown = backend([new Error('Network lost'), new Error('Still offline')]);
  await assert.rejects(saver(unknown.api)(record(), fields, attempts()), e => e.kind === 'unresolved');
  assert.equal(unknown.calls.length, 2);
});

test('error code/message/hint mapping and diagnostic logging never leak SQL, keys or private details', async () => {
  for (const [code, message, expected] of [['42501', 'permission denied for table', 'forbidden'], ['P0001', 'forbidden', 'forbidden'],
    ['P0001', 'not_found', 'not_found'], ['not_authenticated', '', 'not_authenticated'], ['500', 'SECRET SQL', 'unknown']]) {
    await assert.rejects(backend([{ data: null, error: { code, message, hint: 'city', details: 'SECRET DATA' } }]).api.getRequest(id), e => e.kind === expected);
  }
  assert.ok(errorLog.length > 0);
  assert.doesNotMatch(JSON.stringify(errorLog), /SECRET|private|Synthetic store|00000000/);
});

test('only reviewed contract explanations are exposed, as plain text for the matching error code', () => {
  const input = { code: 'P0001', message: 'invalid_store', hint: 'timezone', details: 'Неизвестный часовой пояс' };
  assert.equal(errors.failure(input).details, input.details);
  for (const details of ['SELECT * FROM users', 'SQL stack trace', '<script>alert(1)</script>', 'private@example.test', '{"token":"secret"}', 'Неизвестный часовой пояс\nSECRET']) {
    assert.equal(errors.failure({ ...input, details }).details, undefined);
  }
  assert.equal(errors.failure({ ...input, code: 'XX000' }).details, undefined);
  assert.equal(errors.failure({ ...input, message: 'forbidden' }).details, undefined);
});

function children(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(children)];
}
function formFixture(recordValue, lang = 'ru', save = async () => ({ record: record(), outcome: 'saved', created: true })) {
  const dict = JSON.parse(source(`src/i18n/adminStoreRequest.${lang}.json`));
  const t = (path, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)),
    path.replace('adminStoreRequest.', '').split('.').reduce((s, part) => s?.[part], dict) ?? path);
  let index = 0, options, focus, saves = [], cleanup, navigationState;
  const navigation = { blocker: { state: 'unblocked' }, allow() { this.allowed = true; }, guard() { this.allowed = false; } };
  const cells = [];
  const react = {
    useState(initial) { const position = index++; if (!(position in cells)) cells[position] = typeof initial === 'function' ? initial() : initial;
      return [cells[position], value => { cells[position] = typeof value === 'function' ? value(cells[position]) : value; }]; },
    useRef(initial) { const position = index++; cells[position] ??= { current: initial }; return cells[position]; },
    useEffect(effect) { cleanup = effect(); },
  };
  const { StoreRequestForm } = load(dir + 'StoreRequestForm.tsx', {
    react, '@tanstack/react-query': { useMutation(value) { options = value; return { isPending: false, mutateAsync: value.mutationFn }; } },
    '../../../design-system': { Alert: 'Alert', Button: 'Button', TextField: 'TextField' },
    '../../../i18n/i18n': { useI18n: () => ({ t }) }, './attempt': attemptModule, './errors': errors, './model': model,
    './save': { saveDetails: save }, './StoreRequestPage.module.css': {},
    'react-router': { Navigate: 'Navigate' },
    './plan/useUnsavedPlan': { useUnsavedPlan: (dirty, busy) => { navigationState = { dirty, busy }; return navigation; } },
    './plan/UnsavedPlanDialog': { UnsavedPlanDialog: 'UnsavedPlanDialog' },
  }, { window: { sessionStorage: memory() }, crypto: { randomUUID: () => key }, document: { getElementById: value => ({ focus: () => { focus = value; } }) } });
  return { render() { index = 0; return StoreRequestForm({ record: recordValue, userId: 'synthetic-user', onSaved: (...args) => saves.push(args), onReload: async () => {} }); },
    get options() { return options; }, get saves() { return saves; }, get focus() { return focus; }, get navigationState() { return navigationState; }, navigation, dispose() { cleanup(); } };
}

test('form mount performs no creation; double click is blocked before render; automatic retries are disabled', async () => {
  let calls = 0, resolve;
  const fixture = formFixture(record(), 'ru', () => { calls++; return new Promise(done => { resolve = done; }); });
  const tree = fixture.render();
  assert.equal(calls, 0); assert.equal(fixture.options.retry, false); assert.equal(fixture.options.networkMode, 'always');
  const saveButton = children(tree).find(node => node.type === 'Button' && node.props.children === 'Сохранить');
  saveButton.props.onClick(); saveButton.props.onClick();
  assert.equal(calls, 1);
  resolve({ record: record({ revision: 2 }), outcome: 'saved', created: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.saves.length, 1); assert.equal(fixture.saves[0][1], false);
});

test('form validates required fields, focuses first error, shows hint-specific RPC errors and keeps nullable inputs controlled', async () => {
  const empty = formFixture(null);
  empty.render().props.onSubmit({ preventDefault() {} });
  assert.equal(empty.focus, 'store-request-name');
  assert.equal(children(empty.render()).find(node => node.props?.name === 'name').props.error, 'Введите название от 2 до 120 символов.');
  const invalid = formFixture(record(), 'ru', async () => { throw new errors.RequestFailure('invalid_store', 'city'); });
  invalid.render().props.onSubmit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(invalid.focus, 'store-request-city');
  assert.ok(children(invalid.render()).find(node => node.props?.name === 'city').props.error);
  const nullable = formFixture(model.parseRequest({ request: record({ name: null, city: null, address: null }) }, id));
  const inputs = children(nullable.render()).filter(node => node.type === 'TextField');
  assert.ok(inputs.every(node => typeof node.props.value === 'string'));
  assert.equal(inputs.length, 4); assert.ok(inputs.every(node => node.props.name !== 'partner'));
});

test('first step protects unsaved fields; unsuccessful reconciliation keeps navigation guarded', async () => {
  const fixture = formFixture(record(), 'ru', async () => ({ record: record(), outcome: 'unchanged', created: false }));
  let tree = fixture.render(); assert.equal(fixture.navigationState.dirty, false);
  children(tree).find(n => n.props?.name === 'name').props.onChange({ target: { value: 'Edited name' } });
  tree = fixture.render(); assert.equal(fixture.navigationState.dirty, true);
  tree.props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve));
  fixture.render(); assert.equal(fixture.navigation.allowed, false);
  fixture.navigation.blocker.state = 'blocked';
  assert.ok(children(fixture.render()).some(n => n.type === 'UnsavedPlanDialog'));
});

test('read-only/author gates, rejected comment and unresolved result prevent an accidental second write', async () => {
  for (const value of [record({ status: 'approved' }), record({ status: 'pending_owner_approval' }), record({ status: 'future' }), record({ is_mine: false })]) {
    const tree = formFixture(value).render();
    assert.ok(children(tree).filter(node => node.type === 'TextField').every(node => node.props.readOnly));
    assert.equal(children(tree).filter(node => node.type === 'Button').length, 1);
  }
  const rejected = formFixture(record({ status: 'rejected', review_comment: 'Line one\n<script>plain text</script>' })).render();
  assert.ok(children(rejected).some(node => node.props?.children === 'Line one\n<script>plain text</script>'));
  let writes = 0;
  const fixture = formFixture(record(), 'ru', async () => { writes++; throw new errors.RequestFailure('unresolved'); });
  fixture.render().props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve));
  const tree = fixture.render();
  assert.ok(children(tree).find(node => node.type === 'Button' && node.props.type === 'submit').props.disabled);
  tree.props.onSubmit({ preventDefault() {} }); assert.equal(writes, 1);
});

test('all three locales render existing design-system inputs without raw keys; no partner field', () => {
  const field = load('src/design-system/TextField.tsx', { './AppLink': { AppLink: 'a' }, react: { useId }, './cx': { cx: (...v) => v.filter(Boolean).join(' ') }, './Icon': { Icon: () => null }, './IconButton': {} }).TextField;
  for (const lang of ['ru', 'kk', 'en']) {
    const fixture = formFixture(record(), lang);
    const tree = fixture.render();
    assert.doesNotMatch(JSON.stringify(tree), /adminStoreRequest\./);
    const html = renderToStaticMarkup(createElement('div', null, children(tree).filter(node => node.type === 'TextField').map(node => createElement(field, { ...node.props, key: node.props.name }))));
    assert.equal((html.match(/<input /g) ?? []).length, 4);
    assert.equal((html.match(/<label /g) ?? []).length, 4);
    assert.match(html, /Asia\/Almaty/);
    assert.doesNotMatch(html, /partner|adminStoreRequest\./);
  }
});

test('request query waits for session and valid UUID, separates user/request cache; new view has no RPC', () => {
  const mixedCaseId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  assert.deepEqual(plain(model.requestKey('a', mixedCaseId.toUpperCase())), plain(model.requestKey('a', mixedCaseId)));
  for (const [session, requestId, enabled] of [[null, id, false], [{ user: { id: 'a' } }, undefined, false], [{ user: { id: 'a' } }, 'bad', false], [{ user: { id: 'b' } }, id, true]]) {
    let options, reads = 0;
    const hook = load(dir + 'useStoreRequest.ts', { '@tanstack/react-query': { useQuery: value => { options = value; } },
      '../../../auth/useAuthSession': { useAuthSession: () => ({ status: 'ready', session }) }, '../model': stores,
      './api': { getRequest: () => { reads++; } }, './model': model });
    hook.useStoreRequest(requestId);
    assert.equal(options.enabled, enabled); assert.equal(reads, 0); assert.equal(options.retry, false);
    assert.deepEqual(plain(options.queryKey), ['admin', 'store-request', session?.user.id ?? '', requestId ?? '']);
    assert.equal(options.placeholderData, undefined);
  }
});

test('one route per wizard address under the existing RequireAdmin; store list and detail remain intact', () => {
  const routes = source('src/routes.tsx');
  for (const path of ['stores/new', 'stores/new/:requestId']) assert.equal(routes.split(`path: '${path}'`).length - 1, 1);
  const root = routes.indexOf("path: '/admin', element: <RequireAdmin />");
  const end = routes.indexOf("{ path: '*', element: <AdminNotFound />");
  assert.ok(root >= 0 && end > root);
  for (const path of ['stores', 'stores/new', 'stores/new/:requestId', 'stores/:id']) {
    const offset = routes.indexOf(`path: '${path}'`); assert.ok(offset > root && offset < end);
  }
  assert.match(source('src/admin/stores/StoresPage.tsx'), /href="\/admin\/stores\/new"/);
  assert.match(source(dir + 'StoreRequestPage.tsx'), /replace: result.created/);
  assert.match(source(dir + 'StoreRequestPage.tsx'), /StoreReviewStep/);
  assert.doesNotMatch(source(dir + 'api.ts'), /\.from\(|\.insert\(|\.update\(|rpc\('_store_/);
});

function pageFixture({ requestId, search = '', data, session = { user: { id: 'user-a' } }, queryError } = {}) {
  const navigations = [], cache = [], lookups = [];
  const { StoreRequestPage } = load(dir + 'StoreRequestPage.tsx', {
    react: { useState: initial => [initial, () => {}], useEffect: () => {} },
    'react-router': { Navigate: 'Navigate', useParams: () => ({ requestId }), useNavigate: () => (...args) => navigations.push(args), useSearchParams: () => [new URLSearchParams(search)] },
    '@tanstack/react-query': { useQueryClient: () => ({ setQueryData: (...args) => cache.push(args) }) },
    '../../../design-system': { Alert: 'Alert', Button: 'Button', Skeleton: 'Skeleton', Stepper: 'Stepper' },
    '../../../i18n/i18n': { useI18n: () => ({ t: key => key }) },
    '../../../auth/useAuthSession': { useAuthSession: () => ({ status: 'ready', session }) }, '../model': stores,
    './errors': errors, './model': model, './attempt': attemptModule,
    './useStoreRequest': { useStoreRequest: request => { lookups.push(request); return { data, isError: Boolean(queryError), error: queryError }; } },
    './StoreRequestForm': { StoreRequestForm: 'StoreRequestForm' }, './StoreRequestPage.module.css': {},
    './plan/StorePlanStep': { StorePlanStep: 'StorePlanStep' },
    './zoning/StoreZoningStep': { StoreZoningStep: 'StoreZoningStep' },
    './review/StoreReviewStep': { StoreReviewStep: 'StoreReviewStep' },
  });
  const wrapper = StoreRequestPage();
  return { wrapper, tree: wrapper ? wrapper.type(wrapper.props) : null, navigations, cache, lookups };
}

test('actual page save handlers replace new URLs, use returned revision and distinguish Save from Continue', () => {
  for (const next of [false, true]) {
    const page = pageFixture();
    const form = children(page.tree).find(node => node.type === 'StoreRequestForm');
    assert.equal(form.props.record, null);
    form.props.onSaved({ record: record(), created: true, outcome: 'saved' }, next);
    assert.deepEqual(plain(page.navigations), [[`/admin/stores/new/${id}?step=${next ? 'plan' : 'details'}`, { replace: true }]]);
    assert.equal(page.cache[0][1].revision, 1);
  }
  const existing = pageFixture({ requestId: id, data: record({ revision: 4 }) });
  const form = children(existing.tree).find(node => node.type === 'StoreRequestForm');
  assert.equal(form.props.record.revision, 4);
  form.props.onSaved({ record: record({ revision: 5 }), created: false, outcome: 'saved' }, false);
  assert.equal(existing.navigations.length, 0); assert.equal(existing.cache[0][1].revision, 5);
  form.props.onSaved({ record: record({ revision: 6 }), created: false, outcome: 'changed' }, true);
  assert.equal(existing.navigations.length, 0); assert.equal(existing.cache[1][1].revision, 6);
});

test('page guards and step handling never offer editing on invalid IDs, errors or absent session', () => {
  const absent = pageFixture({ session: null }); assert.equal(absent.tree, null); assert.equal(absent.lookups.length, 0);
  for (const page of [pageFixture({ requestId: 'invalid' }), pageFixture({ requestId: id, queryError: new errors.RequestFailure('forbidden') }),
    pageFixture({ requestId: id, queryError: new errors.RequestFailure('not_found') })]) {
    assert.equal(children(page.tree).filter(node => node.type === 'StoreRequestForm').length, 0);
  }
  for (const search of ['step=unknown', 'step=details&step=plan']) {
    const page = pageFixture({ requestId: id, data: record(), search });
    assert.equal(page.tree.type, 'Navigate'); assert.equal(page.tree.props.replace, true);
    assert.equal(page.tree.props.to, model.requestPath(id));
  }
  const planPage = pageFixture({ requestId: id, data: record(), search: 'step=plan' });
  assert.ok(children(planPage.tree).some(node => node.type === 'StorePlanStep'));
  const gated = pageFixture({ requestId: id, data: record(), search: 'step=zoning' });
  assert.ok(children(gated.tree).some(node => node.type === 'Alert' && node.props.title === 'adminStoreZoning.planRequired'));
  for (const step of ['zoning', 'review']) {
    const page = pageFixture({ requestId: id, data: record({ plan: { plan_data: {}, source_file_name: null } }), search: 'step=' + step });
    assert.equal(children(page.tree).filter(node => node.type === 'StoreRequestForm').length, 0);
    assert.ok(children(page.tree).some(node => node.type === (step === 'zoning' ? 'StoreZoningStep' : 'StoreReviewStep')));
  }
  const a = pageFixture({ requestId: id, data: record() }), b = pageFixture({ requestId: other, data: record({ id: other, name: 'Second request' }) });
  assert.notEqual(a.wrapper.key, b.wrapper.key);
  assert.equal(children(b.tree).find(node => node.type === 'StoreRequestForm').props.record.name, 'Second request');
  const zoning = pageFixture({ requestId: id, data: record({ revision: 4, plan: {} }), search: 'step=zoning' });
  assert.notEqual(a.wrapper.key, zoning.wrapper.key);
  const editor = children(zoning.tree).find(node => node.type === 'StoreZoningStep');
  editor.props.onRevision(5); assert.equal(zoning.cache[0][1].revision, 5);
  editor.props.onSaved({ record: record({ revision: 5 }), outcome: 'changed' }, true); assert.equal(zoning.navigations.length, 0);
  editor.props.onSaved({ record: record({ revision: 6 }), outcome: 'saved' }, true); assert.deepEqual(plain(zoning.navigations), [[model.requestPath(id, 'review')]]);
});
