import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { File } from 'node:buffer';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Local JSON and in-memory API doubles only. No env, network or production RPCs.
const require = createRequire(import.meta.url);
const root = 'src/admin/stores/onboarding/';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function load(path, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, TextEncoder, AbortSignal, console: { error() {} }, ...globals, require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name in modules) return modules[name];
      throw new Error('Unexpected dependency: ' + name);
    } }, { filename: path });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const stores = load('src/admin/stores/model.ts');
const model = load(root + 'model.ts', { '../model': stores });
const errors = load(root + 'errors.ts', { './model': model });
const plan = load(root + 'plan/model.ts');
const example = () => plain(plan.EXAMPLE_PLAN);
const id = '00000000-0000-4000-8000-000000000001';
const draft = () => ({ data: example(), name: 'layout.json' });
const record = overrides => ({ id, revision: 4, status: 'inactive', is_mine: true, name: 'Synthetic', city: '', address: '', timezone: 'Asia/Almaty',
  review_comment: null, published_store_id: null, plan: null, ...overrides });
const envelope = r => ({ request: r, plan: r.plan });
const ok = data => ({ data, error: null });
const fail = (message, hint = '') => ({ data: null, error: { code: 'P0001', message, hint, details: 'PRIVATE SQL DETAIL' } });
function backend(responses) {
  const calls = [];
  const supabase = { requireSupabase: () => ({ rpc(name, args) { calls.push({ name, args }); return {
    abortSignal(signal) { assert.ok(signal); const reply = responses.shift(); return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply); },
  }; } }) };
  const api = load(root + 'api.ts', { '../../../lib/supabase': supabase, '../model': stores, './model': model, './errors': errors });
  const planApi = load(root + 'plan/api.ts', { '../../../../lib/supabase': supabase, '../../model': stores, '../api': api, '../errors': errors, './model': plan });
  const save = load(root + 'plan/save.ts', { '../api': api, '../model': model, '../errors': errors, './model': plan, './api': planApi }).savePlan;
  return { calls, api, planApi, save };
}

test('valid local JSON and sample load without any server dependency; all 14 kinds supported', async () => {
  const loaded = await plan.readPlanFile(new File([JSON.stringify(example())], 'floor.JSON', { type: 'application/json' }));
  assert.equal(loaded.name, 'floor.JSON'); assert.equal(loaded.data.version, 1); assert.equal(loaded.data.elements.length, 3);
  for (const kind of plan.KINDS) { const value = example(); value.elements[0].kind = kind; assert.equal(plan.validatePlan(value).elements[0].kind, kind); }
  const nullable = example(); nullable.elements[0].category = null; nullable.elements[0].label = ''; plan.validatePlan(nullable);
});

test('invalid JSON, unsupported file type, long file name and large UTF-8 files are rejected before saving', async () => {
  await assert.rejects(plan.readPlanFile(new File(['{ broken'], 'plan.json')), e => e.code === 'json');
  for (const name of ['plan.png', 'plan.jpg', 'plan.svg', 'plan.pdf']) await assert.rejects(plan.readPlanFile(new File(['{}'], name)), e => e.code === 'extension');
  await assert.rejects(plan.readPlanFile(new File(['{}'], 'a'.repeat(251) + '.json')), e => e.code === 'fileName');
  let reads = 0;
  await assert.rejects(plan.readPlanFile({ name: 'plan.json', size: 524289, text: async () => { reads++; return '{}'; } }), e => e.code === 'size');
  assert.equal(reads, 0);
  const value = example(); value.metadata.text = 'я'.repeat(270000);
  await assert.rejects(plan.readPlanFile(new File([JSON.stringify(value)], 'large.json')), e => e.code === 'size');
  await assert.rejects(plan.readPlanFile({ name: 'plan.json', size: 1, text: async () => { throw new Error('unreadable'); } }), e => e.code === 'fileRead');
});

test('root fields, empty elements and count limits are enforced; errors identify the exact field', () => {
  for (const [value, code, path] of [[null, 'object', 'plan'], [[], 'object', 'plan'], [{ ...example(), version: '1' }, 'version', 'version'],
    [{ ...example(), width: 0 }, 'dimension', 'width'], [{ ...example(), height: 100001 }, 'dimension', 'height'],
    [{ ...example(), width: Infinity }, 'dimension', 'width'], [{ ...example(), elements: [] }, 'elements', 'elements'],
    [{ ...example(), elements: Array(1001).fill({}) }, 'count', 'elements'], [{ ...example(), decorations: Array(2001).fill(null) }, 'count', 'decorations'],
    [{ ...example(), decorations: {} }, 'decorations', 'decorations'], [{ ...example(), metadata: [] }, 'metadata', 'metadata']]) {
    assert.throws(() => plan.validatePlan(value), e => e.code === code && e.path === path);
  }
  const maximum = example(); maximum.width = 100000; maximum.height = 100000;
  maximum.elements = Array.from({ length: 1000 }, (_, i) => ({ ...maximum.elements[0], id: 'e-' + i }));
  maximum.decorations = Array(2000).fill(null); plan.validatePlan(maximum);
});

test('duplicate IDs, element bounds, types, label/category limits and non-finite coordinates report element and field', () => {
  const duplicate = example(); duplicate.elements[1].id = duplicate.elements[0].id;
  assert.throws(() => plan.validatePlan(duplicate), e => e.code === 'duplicate' && e.path.includes('elements[1].id (A-1)'));
  for (const [field, value, code] of [['id', 'bad id', 'id'], ['kind', 'script', 'kind'], ['x', -1, 'coordinate'], ['y', NaN, 'coordinate'],
    ['width', 0, 'extent'], ['height', '10', 'extent'], ['x', 1199, 'bounds'], ['y', 799, 'bounds'],
    ['label', 'a'.repeat(121), 'label'], ['label', null, 'label'], ['category', 'a'.repeat(61), 'category']]) {
    const input = example(); input.elements[0][field] = value;
    assert.throws(() => plan.validatePlan(input), e => e.code === code && e.path.startsWith('elements[0]'));
  }
});

test('nested HTML/JS is rejected; metadata and decorations stay data; size includes serialized bytes', () => {
  for (const unsafe of ['<script>', 'javascript:alert(1)', 'onload=run()', 'data:text/html,x']) {
    const value = example(); value.metadata.nested = { value: unsafe };
    assert.throws(() => plan.validatePlan(value), e => e.code === 'unsafe' && e.path === 'plan.metadata.nested.value');
  }
  const tooLarge = example(); tooLarge.metadata.payload = 'x'.repeat(524288);
  assert.throws(() => plan.validatePlan(tooLarge), e => e.code === 'size');
});

test('get_store_request preserves saved plan and nullable filename; bad envelope fails closed', async () => {
  const stored = record({ plan: { plan_data: example(), source_file_name: null } });
  const mock = backend([ok(envelope(stored))]);
  const fetched = await mock.api.getRequest(id);
  assert.deepEqual(plain(fetched.plan), stored.plan);
  assert.equal(model.parseRequest(envelope(record()), id).plan, null);
  assert.throws(() => model.parseRequest({ request: record(), plan: { source_file_name: 42 } }, id));
});

test('save calls admin_save_store_plan exactly once with all arguments and updates revision/plan only after success', async () => {
  const mock = backend([ok(5)]), value = draft();
  const result = await mock.save(record(), value);
  assert.equal(result.record.revision, 5); assert.equal(result.outcome, 'saved');
  assert.deepEqual(plain(result.record.plan), { plan_data: value.data, source_file_name: value.name });
  assert.deepEqual(plain(mock.calls), [{ name: 'admin_save_store_plan', args: { p_id: id, p_expected_revision: 4, p_plan: value.data, p_source_file_name: 'layout.json' } }]);
  const noName = backend([ok(5)]); await noName.planApi.saveStorePlan(id, 4, { ...draft(), name: null });
  assert.equal('p_source_file_name' in noName.calls[0].args, false);
});

test('invalid UUID/local plan/read-only status/other author never send a mutation', async () => {
  const mock = backend([]);
  await assert.rejects(mock.planApi.saveStorePlan('bad', 4, draft()));
  await assert.rejects(mock.planApi.saveStorePlan(id, 0, draft()));
  await assert.rejects(mock.save(record(), { ...draft(), data: { ...example(), elements: [] } }), e => e.code === 'elements');
  for (const status of ['pending_owner_approval', 'approved', 'future']) await assert.rejects(mock.save(record({ status }), draft()), e => e.kind === 'forbidden');
  await assert.rejects(mock.save(record({ is_mine: false }), draft())); assert.equal(mock.calls.length, 0);
});

test('revision conflict reloads actual data once; invalid_status forces read only without another save', async () => {
  for (const reason of ['revision_conflict', 'invalid_status']) {
    const fresh = record({ revision: 7, plan: { plan_data: example(), source_file_name: 'server.json' } });
    const mock = backend([fail(reason), ok(envelope(fresh))]);
    const result = await mock.save(record(), draft());
    assert.equal(result.outcome, 'changed'); assert.equal(result.record.revision, 7);
    assert.equal(result.readOnly, reason === 'invalid_status');
    assert.deepEqual(mock.calls.map(call => call.name), ['admin_save_store_plan', 'get_store_request']);
  }
});

test('unknown result succeeds only at revision+1 with matching JSON; key ordering is irrelevant and array order matters', async () => {
  const data = example(); const reordered = Object.fromEntries(Object.entries(data).reverse());
  assert.equal(plan.sameJson(data, reordered), true);
  assert.equal(plan.sameJson([1, 2], [2, 1]), false);
  for (const [revision, saved, expected] of [[5, reordered, 'saved'], [4, data, 'changed'], [6, data, 'changed'], [5, { ...data, width: 2000 }, 'changed']]) {
    const fresh = record({ revision, plan: { plan_data: saved, source_file_name: 'layout.json' } });
    const mock = backend([new Error('Network lost'), ok(envelope(fresh))]);
    assert.equal((await mock.save(record(), draft())).outcome, expected);
    assert.equal(mock.calls.length, 2);
  }
  const offline = backend([new Error('Network lost'), new Error('Still offline')]);
  await assert.rejects(offline.save(record(), draft()), e => e.kind === 'unresolved');
  assert.equal(offline.calls.length, 2);
});

test('backend errors retain safe field hints; raw details and SQL are never surfaced', async () => {
  for (const [reason, hint] of [['invalid_plan', 'elements.width'], ['plan_too_large', 'plan'], ['too_many_elements', 'decorations'], ['duplicate_element', 'elements.id'], ['forbidden', ''], ['not_found', '']]) {
    const mock = backend([fail(reason, hint)]);
    await assert.rejects(mock.save(record(), draft()), e => e.kind === reason && e.hint === (hint || undefined) && !e.message.includes('PRIVATE'));
    assert.equal(mock.calls.length, 1);
  }
  assert.equal(errors.failure({ code: '42501', message: 'PRIVATE SQL' }).kind, 'forbidden');
  assert.equal(errors.failure({ message: 'invalid_plan', hint: '<script>bad</script>' }).hint, undefined);
});

function translator(lang) {
  const dicts = Object.fromEntries(['adminStorePlan', 'adminStoreRequest'].map(name => [name, JSON.parse(read(`src/i18n/${name}.${lang}.json`))]));
  return (key, values = {}) => Object.entries(values).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), key.split('.').reduce((s, k) => s?.[k], dicts) ?? key);
}
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(nodes)];
}
function stepFixture(value, saveImpl = async () => ({ record: value, outcome: 'saved', readOnly: false })) {
  const cells = []; let index = 0, mutationOptions, dirty, pendingRead, saved = [];
  const hooks = {
    useState(initial) { const cell = index++; if (!(cell in cells)) cells[cell] = typeof initial === 'function' ? initial() : initial;
      return [cells[cell], next => { cells[cell] = typeof next === 'function' ? next(cells[cell]) : next; }]; },
    useRef(initial) { const cell = index++; cells[cell] ??= { current: initial }; return cells[cell]; }, useEffect(fn) { fn(); },
  };
  const { StorePlanStep } = load(root + 'plan/StorePlanStep.tsx', {
    react: hooks, '@tanstack/react-query': { useMutation(options) { mutationOptions = options; return { isPending: false, mutateAsync: options.mutationFn }; } },
    '../../../../design-system': { Alert: 'Alert', Button: 'Button', FileDrop: 'FileDrop' }, '../../../../i18n/i18n': { useI18n: () => ({ t: translator('ru') }) },
    '../errors': errors, '../model': model, './model': plan, './save': { savePlan: saveImpl }, './PlanPreview': { PlanPreview: 'PlanPreview' },
    './useUnsavedPlan': { useUnsavedPlan: (d, b) => { dirty = d; pendingRead = b; return { blocker: { state: 'unblocked' }, guard() {}, allow() {} }; } },
    './UnsavedPlanDialog': { UnsavedPlanDialog: 'Dialog' }, '../StoreRequestPage.module.css': {}, './StorePlan.module.css': {},
  });
  return { render() { index = 0; return StorePlanStep({ record: value, onSaved: (...args) => saved.push(args), onReload: async () => { throw new Error('offline'); } }); },
    get mutationOptions() { return mutationOptions; }, get dirty() { return dirty; }, get pendingRead() { return pendingRead; }, get saved() { return saved; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('step shows the saved plan and filename; read-only states hide upload and saving', () => {
  const stored = { plan_data: example(), source_file_name: 'saved.json' };
  const fixture = stepFixture(record({ plan: stored }));
  const tree = fixture.render();
  assert.equal(nodes(tree).find(n => n.type === 'PlanPreview').props.plan.elements.length, 3);
  assert.match(JSON.stringify(tree), /saved.json/); assert.equal(fixture.dirty, false);
  for (const overrides of [{ status: 'approved' }, { status: 'pending_owner_approval' }, { is_mine: false }, { status: 'unknown' }]) {
    const tree = stepFixture(record({ plan: stored, ...overrides })).render();
    assert.ok(nodes(tree).some(n => n.type === 'PlanPreview'));
    assert.equal(nodes(tree).filter(n => n.type === 'FileDrop').length, 0);
    assert.equal(nodes(tree).filter(n => n.type === 'Button' && /Сохранить/.test(n.props.children)).length, 0);
  }
});

test('local file selection marks dirty; invalid replacement blocks saving; double click and automatic retry are blocked', async () => {
  let writes = 0, resolve;
  const fixture = stepFixture(record(), () => { writes++; return new Promise(done => { resolve = done; }); });
  let tree = fixture.render();
  assert.equal(writes, 0); assert.equal(fixture.mutationOptions.retry, false);
  nodes(tree).find(n => n.type === 'FileDrop').props.onFile(new File([JSON.stringify(example())], 'new.json'));
  await tick(); tree = fixture.render(); assert.equal(fixture.dirty, true);
  assert.ok(nodes(tree).some(n => n.type === 'PlanPreview'));
  const save = nodes(tree).find(n => n.type === 'Button' && n.props.children === 'Сохранить и продолжить');
  save.props.onClick(); save.props.onClick(); assert.equal(writes, 1);
  resolve({ record: record({ revision: 5, plan: { plan_data: example(), source_file_name: 'new.json' } }), outcome: 'saved', readOnly: false });
  await tick(); assert.equal(fixture.saved[0][1], true);
  const bad = stepFixture(record());
  nodes(bad.render()).find(n => n.type === 'FileDrop').props.onFile(new File(['{bad'], 'bad.json'));
  await tick(); const badTree = bad.render();
  assert.ok(nodes(badTree).find(n => n.type === 'Button' && n.props.children === 'Сохранить').props.disabled);
  assert.match(JSON.stringify(badTree), /корректный JSON/);
});

test('unresolved outcome remains blocked after another failed read; invalid_status switches the step to read only', async () => {
  const stored = { plan_data: example(), source_file_name: 'saved.json' };
  const fixture = stepFixture(record({ plan: stored }), async () => { throw new errors.RequestFailure('unresolved'); });
  nodes(fixture.render()).find(n => n.type === 'Button' && n.props.children === 'Сохранить').props.onClick(); await tick();
  nodes(fixture.render()).find(n => n.type === 'Button' && n.props.children === 'Проверить состояние заявки').props.onClick(); await tick();
  assert.ok(nodes(fixture.render()).find(n => n.type === 'Button' && n.props.children === 'Сохранить').props.disabled);
  const forbiddenStatus = stepFixture(record({ plan: stored }), async () => { throw new errors.RequestFailure('invalid_status'); });
  nodes(forbiddenStatus.render()).find(n => n.type === 'Button' && n.props.children === 'Сохранить').props.onClick(); await tick();
  assert.equal(nodes(forbiddenStatus.render()).filter(n => n.type === 'FileDrop').length, 0);
});

test('unsaved-plan guard protects route changes and page unload, but permits navigation after confirmed save', () => {
  let predicate, unload;
  const hook = load(root + 'plan/useUnsavedPlan.ts', { react: { useCallback: fn => fn, useRef: value => ({ current: value }) },
    'react-router': { useBlocker: fn => { predicate = fn; return { state: 'unblocked' }; }, useBeforeUnload: fn => { unload = fn; } } });
  const guard = hook.useUnsavedPlan(true, false);
  const navigation = { currentLocation: { pathname: '/admin/stores/new/' + id, search: '?step=plan' }, nextLocation: { pathname: '/admin/stores', search: '' } };
  assert.equal(predicate(navigation), true);
  let prevented = false; unload({ preventDefault() { prevented = true; }, returnValue: undefined }); assert.equal(prevented, true);
  guard.allow(); assert.equal(predicate(navigation), false);
  guard.guard(); assert.equal(predicate(navigation), true);
  hook.useUnsavedPlan(false, false); assert.equal(predicate(navigation), false);
});

test('safe SVG preview displays geometry, text and count in all locales; zoom and fit are controlled', () => {
  for (const lang of ['ru', 'kk', 'en']) {
    let zoom = 1, scrolled = false;
    const { PlanPreview } = load(root + 'plan/PlanPreview.tsx', {
      react: { useState: initial => initial === 1 ? [zoom, next => { zoom = typeof next === 'function' ? next(zoom) : next; }] : [null, () => {}], useRef: () => ({ current: { scrollTo() { scrolled = true; } } }) },
      '../../../../design-system': { Button: ({ children, size: _s, variant: _v, ...props }) => React.createElement('button', props, children) },
      '../../../../i18n/i18n': { useI18n: () => ({ t: translator(lang) }) }, './StorePlan.module.css': {},
    });
    let tree = PlanPreview({ plan: example() });
    const html = renderToStaticMarkup(tree);
    assert.match(html, /viewBox="0 0 1200 800"/); assert.match(html, /A-1/);
    assert.equal((html.match(/<rect /g) ?? []).length, 4); assert.doesNotMatch(html, /adminStorePlan\./);
    nodes(tree).find(n => n.props?.['aria-label'] === translator(lang)('adminStorePlan.zoomIn')).props.onClick();
    assert.equal(zoom, 1.5);
    tree = PlanPreview({ plan: example() });
    nodes(tree).find(n => n.props?.children === translator(lang)('adminStorePlan.fit')).props.onClick();
    assert.equal(zoom, 1); assert.equal(scrolled, true);
    const text = example(); text.elements[0].label = '<img src=x onerror=run()>';
    const escaped = renderToStaticMarkup(PlanPreview({ plan: text }));
    assert.doesNotMatch(escaped, /<img/); assert.match(escaped, /&lt;img/);
  }
});

test('saved-plan step reuses the existing route; styles constrain mobile viewport and no unsafe markup is used', () => {
  const routes = read('src/routes/admin.tsx');
  assert.equal(routes.split("path: 'stores/new/:requestId'").length - 1, 1);
  assert.match(read(root + 'StoreRequestPage.tsx'), /step === 'plan' && record/);
  assert.match(read(root + 'StoreRequestPage.tsx'), /next && result.outcome === 'saved'/);
  const css = read(root + 'plan/StorePlan.module.css'); assert.match(css, /overflow: auto/); assert.match(css, /max-width: 600px/);
  for (const path of ['StorePlanStep.tsx', 'PlanPreview.tsx', 'api.ts']) assert.doesNotMatch(read(root + 'plan/' + path), /innerHTML|dangerouslySetInnerHTML|\.from\(\s*['"]|\.insert\(|\.update\(/);
});
