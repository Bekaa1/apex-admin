import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Isolated source modules, synthetic records and in-memory RPC responses. No env/network.
const require = createRequire(import.meta.url), root = 'src/admin/stores/onboarding/';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
function load(path, modules = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { exports, TextEncoder, AbortSignal, crypto: { randomUUID }, console: { error() {} }, ...globals, require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name in modules) return modules[name];
      throw new Error('Unexpected dependency: ' + name);
    } }, { filename: path });
  return exports;
}
const stores = load('src/admin/stores/model.ts');
const model = load(root + 'model.ts', { '../model': stores });
const errors = load(root + 'errors.ts', { './model': model });
const plan = load(root + 'plan/model.ts');
const zoning = load(root + 'zoning/model.ts', { '../errors': errors, '../plan/model': plan });
const id = '00000000-0000-4000-8000-000000000001';
const example = () => plain(plan.EXAMPLE_PLAN);
const record = extra => ({ id, revision: 4, status: 'inactive', is_mine: true, name: 'Synthetic', city: '', address: '', timezone: 'Asia/Almaty', review_comment: null, published_store_id: null,
  plan: { plan_data: example(), source_file_name: 'synthetic.json' }, zones: [], assignments: [], ...extra });
const zone = (extra = {}) => ({ client_id: 'zone-one', name: 'Groceries', color: '#22aa55', description: '', ...extra });
const draft = () => ({ zones: [zone()], assignments: new Map([['A-1', 'zone-one']]) });
const payload = () => zoning.zoningPayload(draft(), example());
function savedRecord(input = payload(), revision = 5) {
  return record({ revision, zones: input.zones.map((z, i) => ({ ...z, id: `server-zone-${i}` })),
    assignments: input.assignments.map(a => ({ element_id: a.element_id, zone_id: `server-zone-${input.zones.findIndex(z => z.client_id === a.zone_client_id)}` })) });
}
const envelope = r => ({ request: r, plan: r.plan, zones: r.zones, assignments: r.assignments });
const ok = data => ({ data, error: null });
const fail = (message, hint) => ({ data: null, error: { code: 'P0001', message, hint, details: 'PRIVATE DETAIL' } });
function backend(responses) {
  const calls = [];
  const supabase = { requireSupabase: () => ({ rpc(name, args) { calls.push({ name, args }); return { abortSignal(signal) {
    assert.ok(signal); const response = responses.shift(); return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  } }; } }) };
  const api = load(root + 'api.ts', { '../../../lib/supabase': supabase, '../model': stores, './model': model, './errors': errors });
  const write = load(root + 'zoning/api.ts', { '../../../../lib/supabase': supabase, '../../model': stores, '../api': api, '../errors': errors });
  const save = load(root + 'zoning/save.ts', { '../api': api, '../model': model, '../errors': errors, '../plan/model': plan, './model': zoning, './api': write });
  return { calls, api, write, ...save };
}
test('create and edit zone preserves a stable zone-UUID; removal clears only its assignments', () => {
  const created = zoning.createZone(), second = zoning.createZone();
  assert.match(created.client_id, /^zone-[0-9a-f-]{36}$/); assert.notEqual(created.client_id, second.client_id);
  let value = { zones: [created, second], assignments: new Map([['A-1', created.client_id], ['F-1', second.client_id]]) };
  value = zoning.changeZone(value, created.client_id, { name: 'First', color: '#123ABC', description: 'Text' });
  assert.equal(value.zones[0].client_id, created.client_id); assert.equal(value.zones[0].name, 'First');
  value = zoning.removeZone(value, created.client_id);
  assert.equal(value.zones.length, 1); assert.equal(value.assignments.has('A-1'), false); assert.equal(value.assignments.get('F-1'), second.client_id);
});
test('brush transfers a single assignment; eraser clears it; unknown elements and zones cannot be assigned', () => {
  let value = { ...draft(), zones: [zone(), zone({ client_id: 'zone-two', name: 'Cold' })] };
  value = zoning.assignElements(value, ['A-1'], 'zone-two', example());
  assert.equal(value.assignments.size, 1); assert.equal(value.assignments.get('A-1'), 'zone-two');
  const unchanged = zoning.assignElements(value, ['F-1'], 'missing-zone', example()); assert.equal(unchanged, value);
  value = zoning.assignElements(value, ['missing-element'], 'zone-two', example()); assert.equal(value.assignments.size, 1);
  value = zoning.assignElements(value, ['A-1'], null, example()); assert.equal(value.assignments.size, 0);
});
test('area includes fully enclosed elements and excludes partial overlap; assignments remain unique', () => {
  const selected = zoning.elementsInArea(example(), { x: 30, y: 30, width: 410, height: 90 });
  assert.deepEqual(plain(selected), ['A-1', 'F-1']);
  assert.deepEqual(plain(zoning.elementsInArea(example(), { x: 41, y: 40, width: 400, height: 60 })), ['F-1']);
  const value = zoning.assignElements(draft(), [...selected, 'A-1'], 'zone-one', example()); assert.equal(value.assignments.size, 2);
});
test('empty zones and duplicate case-insensitive trimmed names block save; unassigned elements are allowed', () => {
  assert.equal(zoning.validateZoning(draft(), example()).length, 0);
  const value = { ...draft(), zones: [zone(), zone({ client_id: 'second', name: ' groceries ' })] };
  const issues = zoning.validateZoning(value, example());
  assert.equal(issues.filter(i => i.code === 'duplicateName').length, 2); assert.ok(issues.some(i => i.code === 'emptyZone' && i.zoneId === 'second'));
  assert.throws(() => zoning.zoningPayload(value, example()), e => e instanceof zoning.ZoningValidationError);
  assert.ok(zoning.validateZoning({ zones: [], assignments: new Map() }, example()).some(i => i.code === 'count'));
});
test('zone field constraints, count limit and assignment references are validated before writing', () => {
  for (const [patch, code] of [[{ name: ' ' }, 'name'], [{ name: 'a'.repeat(81) }, 'name'], [{ color: '#FFF' }, 'color'],
    [{ color: 'url(javascript:evil)' }, 'color'], [{ description: 'a'.repeat(301) }, 'description'], [{ client_id: 'bad id' }, 'clientId']]) {
    assert.ok(zoning.validateZoning({ ...draft(), zones: [zone(patch)] }, example()).some(i => i.code === code));
  }
  const boundary = { ...draft(), zones: [zone({ name: ' ' + 'a'.repeat(80) + ' ', description: 'a'.repeat(300) })] };
  assert.equal(zoning.validateZoning(boundary, example()).length, 0);
  assert.ok(zoning.validateZoning({ zones: Array.from({ length: 201 }, (_, i) => zone({ client_id: 'z' + i, name: 'Z' + i })), assignments: new Map() }, example()).some(i => i.code === 'count'));
  assert.ok(zoning.validateZoning({ ...draft(), assignments: new Map([['gone', 'zone-one'], ['A-1', 'missing']]) }, example()).filter(i => i.code === 'assignment').length === 2);
});
test('payload uses stable client IDs, trimmed fields, upper case colors and sequential sort_order after reorder', () => {
  let value = { zones: [zone({ name: ' Groceries ', description: '  ' }), zone({ client_id: 'cold', name: 'Cold', description: ' note ' })], assignments: new Map([['A-1', 'zone-one'], ['F-1', 'cold']]) };
  value = zoning.moveZone(value, 'cold', -1); const result = zoning.zoningPayload(value, example());
  assert.deepEqual(plain(result.zones.map(z => [z.client_id, z.sort_order, z.color, z.description])), [['cold', 0, '#22AA55', 'note'], ['zone-one', 1, '#22AA55', null]]);
  assert.equal(result.zones[1].name, 'Groceries'); assert.equal(zoning.moveZone(value, 'cold', -1), value);
});
test('restore maps server zone_id to client_id and drops stale element assignments with a warning', () => {
  const stored = savedRecord(); stored.assignments.push({ element_id: 'deleted', zone_id: 'server-zone-0' });
  const result = zoning.restoreZoning(stored);
  assert.equal(result.draft.assignments.get('A-1'), 'zone-one'); assert.deepEqual(plain(result.discarded), ['deleted']);
  assert.deepEqual(plain(zoning.zoningPayload(result.draft, result.plan).assignments), [{ element_id: 'A-1', zone_client_id: 'zone-one' }]);
  assert.equal(result.draft.zones[0].description, '');
});
test('missing plan, malformed zoning and duplicate server assignments fail closed', () => {
  assert.throws(() => zoning.restoreZoning(record({ plan: null })), e => e.kind === 'invalid_plan');
  assert.throws(() => zoning.restoreZoning(record({ plan: { plan_data: {} } })), e => e.kind === 'invalid_plan');
  assert.throws(() => zoning.restoreZoning(record({ zones: undefined })), e => e.kind === 'invalid_response');
  const stored = savedRecord(); stored.assignments.push({ ...stored.assignments[0] });
  assert.throws(() => zoning.restoreZoning(stored), e => e.kind === 'invalid_response');
  const unknown = savedRecord(); unknown.assignments[0].zone_id = 'missing'; assert.equal(zoning.restoreZoning(unknown).discarded.length, 1);
});
test('success is one exact atomic RPC, immediate revision callback, then mandatory read with new zone UUIDs', async () => {
  const mock = backend([ok(5), ok(envelope(savedRecord()))]), revisions = [];
  const result = await mock.saveZoning(record(), draft(), value => { revisions.push(value); assert.equal(mock.calls.length, 1); });
  assert.deepEqual(revisions, [5]); assert.equal(result.outcome, 'saved'); assert.equal(result.record.revision, 5);
  assert.deepEqual(plain(mock.calls[0]), plain({ name: 'admin_replace_store_zoning', args: { p_id: id, p_expected_revision: 4, p_zones: payload().zones, p_assignments: payload().assignments } }));
  assert.equal(mock.calls[1].name, 'get_store_request'); assert.equal(mock.calls.length, 2);
  assert.equal(result.record.zones[0].id, 'server-zone-0'); assert.equal(zoning.restoreZoning(result.record).draft.assignments.get('A-1'), 'zone-one');
});
test('no write for readonly, invalid UUID, malformed plan or invalid local zoning', async () => {
  const mock = backend([]);
  for (const extra of [{ status: 'approved' }, { status: 'pending_owner_approval' }, { status: 'future' }, { is_mine: false }]) await assert.rejects(mock.saveZoning(record(extra), draft(), () => {}), e => e.kind === 'forbidden');
  await assert.rejects(mock.saveZoning(record({ plan: null }), draft(), () => {}), e => e.kind === 'invalid_plan');
  await assert.rejects(mock.saveZoning(record(), { zones: [], assignments: new Map() }, () => {}), e => e instanceof zoning.ZoningValidationError);
  await assert.rejects(mock.write.replaceZoning('bad', 4, payload())); assert.equal(mock.calls.length, 0);
});
test('conflict reloads without retry; invalid_status forces readonly even if the fresh status is editable', async () => {
  for (const reason of ['revision_conflict', 'invalid_status']) {
    const mock = backend([fail(reason), ok(envelope(savedRecord()))]);
    const result = await mock.saveZoning(record(), draft(), () => assert.fail('no confirmed revision'));
    assert.equal(result.outcome, 'changed'); assert.equal(result.readOnly, reason === 'invalid_status'); assert.equal(mock.calls.length, 2);
  }
  const failedRead = backend([fail('invalid_status'), new Error('offline')]);
  await assert.rejects(failedRead.saveZoning(record(), draft(), () => {}), e => e.kind === 'invalid_status');
});
test('unknown outcome compares revision, normalized zones, assignments and plan without blind retries', async () => {
  for (const [stored, expected] of [[savedRecord(), 'saved'], [savedRecord(payload(), 4), 'changed'], [savedRecord(payload(), 6), 'changed'],
    [savedRecord({ ...payload(), assignments: [{ element_id: 'F-1', zone_client_id: 'zone-one' }] }), 'changed']]) {
    const mock = backend([new Error('timeout'), ok(envelope(stored))]);
    const result = await mock.saveZoning(record(), draft(), () => {}); assert.equal(result.outcome, expected); assert.equal(mock.calls.length, 2);
  }
  const noRead = backend([ok(5), new Error('offline')]), revisions = [];
  await assert.rejects(noRead.saveZoning(record(), draft(), rev => revisions.push(rev)), e => e.kind === 'unresolved'); assert.deepEqual(revisions, [5]);
  const recheck = backend([ok(envelope(savedRecord()))]); assert.equal((await recheck.readZoningResult(record(), payload())).outcome, 'saved'); assert.equal(recheck.calls.length, 1);
  const wrongOrder = savedRecord(); wrongOrder.zones[0].sort_order = 9;
  assert.equal(zoning.matchesSaved(wrongOrder, payload()), false);
});
test('server errors carry only whitelisted field hints; no retry for zone/assignment/access errors', async () => {
  for (const [reason, hint] of [['invalid_zones', 'zones.name'], ['invalid_assignments', 'assignments.element_id'], ['invalid_plan', 'plan'], ['forbidden', undefined], ['not_found', undefined]]) {
    const mock = backend([fail(reason, hint)]);
    await assert.rejects(mock.saveZoning(record(), draft(), () => {}), e => e.kind === reason && e.hint === hint); assert.equal(mock.calls.length, 1);
  }
  assert.equal(errors.failure({ code: '42501', message: 'PRIVATE' }).kind, 'forbidden');
  assert.equal(errors.failure({ message: 'invalid_zones', hint: 'PRIVATE NAME', details: 'PRIVATE' }).hint, undefined);
});

function translator(lang = 'ru') {
  const dicts = Object.fromEntries(['adminStorePlan', 'adminStoreRequest', 'adminStoreZoning'].map(name => [name, JSON.parse(read(`src/i18n/${name}.${lang}.json`))]));
  return (key, values = {}) => Object.entries(values).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), key.split('.').reduce((s, k) => s?.[k], dicts) ?? key);
}
function nodes(value) { return !value || typeof value !== 'object' ? [] : [value, ...[value.props?.children].flat(Infinity).flatMap(nodes)]; }
function hookState() {
  const cells = []; let index = 0;
  return { reset() { index = 0; }, hooks: {
    useState(initial) { const i = index++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], next => { cells[i] = typeof next === 'function' ? next(cells[i]) : next; }]; },
    useRef(value) { const i = index++; cells[i] ??= { current: value }; return cells[i]; }, useEffect(fn) { fn(); }, useId: () => 'synthetic-id',
  } };
}
function stepFixture(value = savedRecord(), saveImpl, readImpl) {
  const state = hookState(), saved = [], revisions = []; let dirty, options;
  const { StoreZoningStep } = load(root + 'zoning/StoreZoningStep.tsx', {
    react: state.hooks, '@tanstack/react-query': { useMutation(opts) { options = opts; return { isPending: false, mutateAsync: opts.mutationFn }; } },
    '../../../../design-system': { Alert: 'Alert', Button: 'Button' }, '../../../../i18n/i18n': { useI18n: () => ({ t: translator() }) },
    '../model': model, '../errors': errors, '../plan/PlanPreview': { PlanPreview: 'PlanPreview' },
    '../plan/useUnsavedPlan': { useUnsavedPlan(d) { dirty = d; return { blocker: { state: 'unblocked' }, guard() {}, allow() {} }; } },
    '../plan/UnsavedPlanDialog': { UnsavedPlanDialog: 'Dialog' }, './model': zoning,
    './save': { saveZoning: saveImpl ?? (async () => ({ record: value, outcome: 'saved', readOnly: false })), readZoningResult: readImpl ?? (async () => { throw new errors.RequestFailure('unresolved'); }) },
    './ZonePanel': { ZonePanel: 'ZonePanel' }, '../StoreRequestPage.module.css': {}, './Zoning.module.css': {},
  });
  return { render() { state.reset(); return StoreZoningStep({ record: value, onRevision: v => revisions.push(v), onSaved: (...args) => saved.push(args) }); },
    get dirty() { return dirty; }, get options() { return options; }, saved, revisions };
}
const button = (tree, name) => nodes(tree).find(n => n.type === 'Button' && n.props.children === name);
const tick = () => new Promise(resolve => setImmediate(resolve));
test('actual step brush, area, eraser and selection callbacks update local assignments and mark unsaved state', () => {
  const f = stepFixture(), preview = tree => nodes(tree).find(n => n.type === 'PlanPreview');
  assert.equal(f.dirty, undefined); button(f.render(), 'Кисть').props.onClick();
  preview(f.render()).props.interaction.onElement('F-1'); assert.equal(preview(f.render()).props.interaction.colors.size, 2); assert.equal(f.dirty, true);
  button(f.render(), 'Ластик').props.onClick(); preview(f.render()).props.interaction.onElement('A-1'); assert.equal(preview(f.render()).props.interaction.colors.has('A-1'), false);
  button(f.render(), 'Область').props.onClick(); preview(f.render()).props.interaction.onArea({ x: 0, y: 0, width: 1200, height: 800 }); assert.equal(preview(f.render()).props.interaction.colors.size, 3);
  button(f.render(), 'Выбор').props.onClick(); preview(f.render()).props.interaction.onElement('C-1'); assert.match(JSON.stringify(f.render()), /C-1/);
});
test('readonly hides mutation actions and no-plan/malformed zoning does not mount an editor', () => {
  for (const extra of [{ status: 'approved' }, { status: 'pending_owner_approval' }, { is_mine: false }]) {
    const f = stepFixture({ ...savedRecord(), ...extra }), tree = f.render();
    assert.equal(button(tree, 'Сохранить'), undefined); assert.equal(nodes(tree).find(n => n.type === 'ZonePanel').props.disabled, true);
    nodes(tree).find(n => n.type === 'PlanPreview').props.interaction.onElement('A-1'); f.render(); assert.equal(f.dirty, false);
  }
  for (const extra of [{ plan: null }, { zones: null }]) assert.equal(nodes(stepFixture(record(extra)).render()).some(n => n.type === 'PlanPreview'), false);
});
test('step blocks duplicate clicks, disables automatic retries, clears dirty state only after fresh saved data', async () => {
  let calls = 0, resolve;
  const f = stepFixture(savedRecord(), () => { calls++; return new Promise(done => { resolve = done; }); });
  let tree = f.render(); const panel = nodes(tree).find(n => n.type === 'ZonePanel');
  panel.props.onChange(zoning.changeZone(panel.props.draft, 'zone-one', { name: 'Changed' })); tree = f.render(); assert.equal(f.dirty, true);
  const save = button(tree, 'Сохранить и продолжить'); save.props.onClick(); save.props.onClick(); assert.equal(calls, 1); assert.equal(f.options.retry, false);
  const changed = payload(); changed.zones[0].name = 'Changed'; resolve({ record: savedRecord(changed, 6), outcome: 'saved', readOnly: false });
  await tick(); f.render(); assert.equal(f.dirty, false); assert.equal(f.saved[0][1], true);
});
test('unresolved save stays blocked after failed recheck; invalid_status forces readonly; field error marks panel', async () => {
  const f = stepFixture(savedRecord(), async () => { throw new errors.RequestFailure('unresolved'); });
  button(f.render(), 'Сохранить').props.onClick(); await tick();
  button(f.render(), 'Проверить состояние заявки').props.onClick(); await tick(); assert.equal(button(f.render(), 'Сохранить').props.disabled, true);
  const status = stepFixture(savedRecord(), async () => { throw new errors.RequestFailure('invalid_status'); });
  button(status.render(), 'Сохранить').props.onClick(); await tick(); assert.equal(button(status.render(), 'Сохранить'), undefined);
  const invalid = stepFixture(savedRecord(), async () => { throw new errors.RequestFailure('invalid_zones', undefined, 'zones.name'); });
  button(invalid.render(), 'Сохранить').props.onClick(); await tick(); assert.equal(nodes(invalid.render()).find(n => n.type === 'ZonePanel').props.serverHint, 'zones.name');
});
test('zone panel creates/edits/reorders and requires an explicit confirmation before removal', () => {
  const state = hookState(); let value = draft(), active = 'zone-one';
  const { ZonePanel } = load(root + 'zoning/ZonePanel.tsx', { react: state.hooks,
    '../../../../design-system': { Alert: 'Alert', Button: 'Button', TextField: 'TextField', TextAreaField: 'TextAreaField' },
    '../../../../i18n/i18n': { useI18n: () => ({ t: translator() }) }, './model': zoning, './Zoning.module.css': {}, '../plan/StorePlan.module.css': {} });
  const render = () => { state.reset(); return ZonePanel({ draft: value, active, onActive: id => { active = id; }, onChange: v => { value = v; }, disabled: false, issues: [] }); };
  button(render(), 'Создать зону').props.onClick(); assert.equal(value.zones.length, 2); assert.equal(active, value.zones[1].client_id);
  nodes(render()).find(n => n.type === 'TextField' && n.props.label === 'Название зоны').props.onChange({ target: { value: 'Cold' } }); assert.equal(value.zones[1].name, 'Cold');
  button(render(), 'Выше').props.onClick(); assert.equal(value.zones[0].name, 'Cold');
  active = 'zone-one'; button(render(), 'Удалить зону').props.onClick(); assert.equal(value.zones.length, 2);
  const dialog = nodes(render()).find(n => typeof n.type === 'function'); assert.ok(dialog); dialog.props.onCancel(); assert.equal(value.zones.length, 2);
  button(render(), 'Удалить зону').props.onClick(); nodes(render()).find(n => typeof n.type === 'function').props.onConfirm();
  assert.equal(value.zones.length, 1); assert.equal(value.assignments.size, 0);
});
test('SVG pointer rectangle converts screen to plan coordinates, supports reverse drag and cancellation', () => {
  const state = hookState(), selected = [], areas = [];
  const { PlanPreview } = load(root + 'plan/PlanPreview.tsx', { react: state.hooks, '../../../../design-system': { Button: 'Button' },
    '../../../../i18n/i18n': { useI18n: () => ({ t: translator() }) }, './StorePlan.module.css': {} },
    { DOMPoint: class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return { x: (this.x - 10) / 2, y: (this.y - 20) / 2 }; } } });
  const render = () => { state.reset(); return PlanPreview({ plan: example(), interaction: { selectedId: null, colors: new Map(), labels: new Map(), unassigned: 'No zone', onElement: id => selected.push(id), onArea: area => areas.push(area) } }); };
  const svg = () => nodes(render()).find(n => n.type === 'svg');
  const target = { getScreenCTM: () => ({ inverse: () => ({}) }), setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} };
  const event = (x, y) => ({ currentTarget: target, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, preventDefault() {} });
  svg().props.onPointerDown(event(890, 260)); svg().props.onPointerMove(event(70, 80)); svg().props.onPointerUp(event(70, 80));
  assert.deepEqual(plain(areas), [{ x: 30, y: 30, width: 410, height: 90 }]);
  svg().props.onPointerDown(event(0, 0)); svg().props.onPointerCancel(); svg().props.onPointerUp(event(100, 100)); assert.equal(areas.length, 1);
  nodes(render()).find(n => n.props?.role === 'button').props.onKeyDown({ key: 'Enter', preventDefault() {} }); assert.deepEqual(selected, ['A-1']);
});
test('all locales are complete; safe SVG escapes labels; existing wizard route and guard remain unique', () => {
  const keys = obj => Object.entries(obj).flatMap(([key, value]) => typeof value === 'object' ? keys(value).map(child => key + '.' + child) : [key]).sort();
  for (const lang of ['ru', 'kk', 'en']) {
    assert.deepEqual(keys(JSON.parse(read(`src/i18n/adminStoreZoning.${lang}.json`))), keys(JSON.parse(read('src/i18n/adminStoreZoning.ru.json'))));
    const { PlanPreview } = load(root + 'plan/PlanPreview.tsx', { react: React, '../../../../design-system': { Button: ({ children, size: _s, variant: _v, ...p }) => React.createElement('button', p, children) },
      '../../../../i18n/i18n': { useI18n: () => ({ t: translator(lang) }) }, './StorePlan.module.css': {} });
    const html = renderToStaticMarkup(React.createElement(PlanPreview, { plan: example(), interaction: { selectedId: 'A-1', colors: new Map([['A-1', '#22AA55']]), labels: new Map([['A-1', '<script>text</script>']]), unassigned: translator(lang)('adminStoreZoning.unassigned'), onElement() {} } }));
    assert.doesNotMatch(html, /<script>|adminStorePlan\./); assert.match(html, /&lt;script&gt;/); assert.match(html, /aria-pressed="true"/); assert.match(html, /stroke-dasharray="4 3"/);
  }
  const routes = read('src/routes/admin.tsx'); assert.equal(routes.split("path: 'stores/new/:requestId'").length - 1, 1);
  for (const file of ['api.ts', 'save.ts', 'StoreZoningStep.tsx', 'ZonePanel.tsx']) assert.doesNotMatch(read(root + 'zoning/' + file), /innerHTML|dangerouslySetInnerHTML|\.from\(\s*['"]|\.update\(|\.insert\(/);
  assert.match(read(root + 'StoreRequestPage.tsx'), /step === 'review' && record \? <StoreReviewStep/);
});
