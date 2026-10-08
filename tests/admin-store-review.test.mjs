import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Source modules with explicit local dependencies only. No env, real client or network.
const require = createRequire(import.meta.url), root = 'src/admin/stores/onboarding/';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
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
const stores = load('src/admin/stores/model.ts');
const model = load(root + 'model.ts', { '../model': stores });
const errors = load(root + 'errors.ts', { './model': model });
const plan = load(root + 'plan/model.ts');
const review = load(root + 'review/model.ts', { '../model': model, '../plan/model': plan });
const id = '00000000-0000-4000-8000-000000000001';
const record = extra => ({ id, revision: 4, status: 'inactive', is_mine: true, name: 'Synthetic', city: 'Example', address: 'Example 1', timezone: 'Asia/Almaty', review_comment: null, published_store_id: null, submitted_at: null,
  plan: { plan_data: plain(plan.EXAMPLE_PLAN), source_file_name: 'synthetic.json' },
  zones: [{ id: 'server-zone', client_id: 'zone-one', name: 'Synthetic zone', color: '#22AA55', description: null, sort_order: 0 }],
  assignments: [{ element_id: 'A-1', zone_id: 'server-zone' }], ...extra });
const submitted = extra => record({ revision: 5, status: 'pending_owner_approval', submitted_at: '2026-10-07T12:00:00Z', ...extra });
const envelope = r => ({ request: r, plan: r.plan, zones: r.zones, assignments: r.assignments });
const ok = data => ({ data, error: null });
const fail = message => ({ data: null, error: { code: 'P0001', message, details: 'PRIVATE DETAIL' } });
function backend(responses) {
  const calls = [], revisions = [];
  const supabase = { requireSupabase: () => ({ rpc(name, args) { calls.push({ name, args, revisions: [...revisions] }); return { abortSignal(signal) {
    assert.ok(signal); const response = responses.shift(); return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
  } }; } }) };
  const api = load(root + 'api.ts', { '../../../lib/supabase': supabase, '../model': stores, './model': model, './errors': errors });
  const write = load(root + 'review/api.ts', { '../../../../lib/supabase': supabase, '../../model': stores, '../api': api, '../errors': errors });
  const submit = load(root + 'review/submit.ts', { '../api': api, '../model': model, '../errors': errors, './model': review, './api': write });
  return { calls, revisions, api, write, ...submit };
}
test('complete saved request passes; unassigned elements remain valid and zone IDs are server IDs', () => {
  const result = review.reviewRequest(record()); assert.equal(result.valid, true); assert.equal(result.unassigned, 2);
  assert.equal(result.counts.get('server-zone').size, 1); assert.equal(result.colors.get('A-1'), '#22AA55');
  assert.equal(result.checks.length, 12);
});
test('all trimmed store field limits are checked separately', () => {
  for (const [key, value] of [['name', ' '], ['name', 'a'], ['name', 'a'.repeat(121)], ['city', ''], ['city', 'x'.repeat(81)], ['address', ' '], ['address', 'x'.repeat(201)], ['timezone', ' ']]) {
    const r = review.reviewRequest(record({ [key]: value })); assert.equal(r.valid, false); assert.ok(r.checks.some(c => c.key === key && !c.valid && c.step === 'details'));
  }
  assert.equal(review.reviewRequest(record({ name: '  AB  ', city: ' C ', address: ' A ', timezone: ' Asia/Almaty ' })).valid, true);
});
test('missing/empty/invalid plans cannot be submitted or previewed as valid', () => {
  for (const value of [null, { plan_data: {} }, { plan_data: { ...plain(plan.EXAMPLE_PLAN), elements: [] } }]) {
    const r = review.reviewRequest(record({ plan: value })); assert.equal(r.valid, false); assert.equal(r.plan, null); assert.ok(r.checks.some(c => !c.valid && c.step === 'plan'));
  }
});
test('missing zones, malformed zones and empty zones fail checks without inventing assignments', () => {
  for (const zones of [[], null, [{ ...record().zones[0], color: 'url(javascript:bad)' }]]) assert.equal(review.reviewRequest(record({ zones })).valid, false);
  const value = record(); value.zones.push({ ...value.zones[0], id: 'second', name: 'Empty' });
  const result = review.reviewRequest(value); assert.equal(result.checks.find(c => c.key === 'zoneElements').valid, false); assert.equal(result.counts.get('second').size, 0);
});
test('original assignments expose nonexistent elements, zones and duplicate element assignments', () => {
  for (const [assignment, key] of [[{ element_id: 'missing', zone_id: 'server-zone' }, 'elementLinks'], [{ element_id: 'F-1', zone_id: 'missing' }, 'zoneLinks'], [{ element_id: 'A-1', zone_id: 'server-zone' }, 'unique']]) {
    const value = record(); value.assignments.push(assignment); const r = review.reviewRequest(value);
    assert.equal(r.valid, false); assert.equal(r.checks.find(c => c.key === key).valid, false);
  }
  const duplicate = record(); duplicate.zones.push({ ...duplicate.zones[0], id: 'other' }); duplicate.assignments.push({ element_id: 'A-1', zone_id: 'other' });
  assert.equal(review.reviewRequest(duplicate).checks.find(c => c.key === 'unique').valid, false);
  assert.equal(review.reviewRequest(record({ assignments: null })).valid, false);
});
test('read adapter accepts null submitted_at and preserves actual server date', () => {
  assert.equal(model.parseRequest(envelope(record()), id).submitted_at, null);
  assert.equal(model.parseRequest(envelope(submitted()), id).submitted_at, '2026-10-07T12:00:00Z');
  assert.throws(() => model.parseRequest(envelope(record({ submitted_at: 3 })), id));
});
test('submission uses exact RPC params once and updates revision before mandatory read', async () => {
  const mock = backend([ok(5), ok(envelope(submitted()))]);
  const result = await mock.submitReviewed(record(), rev => mock.revisions.push(rev));
  assert.equal(result.outcome, 'submitted'); assert.equal(result.record.status, 'pending_owner_approval');
  assert.deepEqual(plain(mock.calls), [
    { name: 'admin_submit_store_request', args: { p_id: id, p_expected_revision: 4 }, revisions: [] },
    { name: 'get_store_request', args: { p_id: id }, revisions: [5] },
  ]);
});
test('invalid data, read-only statuses and other administrators never submit', async () => {
  for (const value of [record({ name: '' }), record({ plan: null }), record({ zones: [] }), record({ is_mine: false }), record({ status: 'approved' }), submitted(), record({ status: 'future_status' })]) {
    const mock = backend([]); await assert.rejects(mock.submitReviewed(value, () => {})); assert.equal(mock.calls.length, 0);
  }
  const rejected = backend([ok(5), ok(envelope(submitted()))]); assert.equal((await rejected.submitReviewed(record({ status: 'rejected' }), () => {})).outcome, 'submitted');
});
test('revision conflict and stale status trigger a read but never a second mutation', async () => {
  for (const reason of ['revision_conflict', 'invalid_status']) {
    const mock = backend([fail(reason), ok(envelope(submitted()))]); const result = await mock.submitReviewed(record(), () => {});
    assert.equal(result.outcome, 'changed'); assert.equal(result.reason, reason); assert.equal(result.record.revision, 5); assert.equal(mock.calls.length, 2);
  }
});
test('network uncertainty is success only for pending status with exactly revision + 1', async () => {
  for (const [fresh, expected] of [[submitted(), 'submitted'], [submitted({ revision: 6 }), 'changed'], [record(), 'changed'], [record({ revision: 5 }), 'changed'], [submitted({ status: 'approved' }), 'changed']]) {
    const mock = backend([new Error('offline'), ok(envelope(fresh))]); const result = await mock.submitReviewed(record(), () => {});
    assert.equal(result.outcome, expected); assert.equal(mock.calls.length, 2);
  }
});
test('unknown write/read result stays unresolved; manual recheck only reads', async () => {
  const mock = backend([ok(5), new Error('offline')]); await assert.rejects(mock.submitReviewed(record(), rev => mock.revisions.push(rev)), e => e.kind === 'unresolved'); assert.deepEqual(mock.revisions, [5]);
  const readOnly = backend([ok(envelope(submitted()))]); assert.equal((await readOnly.readSubmission(record())).outcome, 'submitted'); assert.equal(readOnly.calls[0].name, 'get_store_request');
});
test('server validation, owner and access errors do not retry or silently succeed', async () => {
  for (const kind of ['invalid_store', 'invalid_plan', 'invalid_zones', 'invalid_assignments', 'forbidden', 'not_found', 'owner_not_configured', 'not_authenticated']) {
    const mock = backend([fail(kind)]); await assert.rejects(mock.submitReviewed(record(), () => {}), e => e.kind === kind); assert.equal(mock.calls.length, 1);
  }
  assert.equal(errors.failure({ code: '42501', message: 'private' }).kind, 'forbidden');
  assert.equal(review.errorStep('invalid_assignments'), 'zoning'); assert.equal(review.errorStep('invalid_plan'), 'plan'); assert.equal(review.errorStep('invalid_store'), 'details');
});
function translator(lang = 'ru') {
  const dict = Object.fromEntries(['adminStoreReview', 'adminStoreRequest', 'adminStorePlan', 'adminStoreZoning'].map(name => [name, JSON.parse(read(`src/i18n/${name}.${lang}.json`))]));
  return (key, values = {}) => Object.entries(values).reduce((text, [k, v]) => text.replaceAll('{' + k + '}', String(v)), key.split('.').reduce((obj, k) => obj?.[k], dict) ?? key);
}
function nodes(value) { return !value || typeof value !== 'object' ? [] : [value, ...[value.props?.children].flat(Infinity).flatMap(nodes)]; }
const button = (tree, name) => nodes(tree).find(n => n.type === 'Button' && n.props.children === name);
const tick = () => new Promise(resolve => setImmediate(resolve));
function hookState() {
  const cells = []; let index = 0;
  return { reset() { index = 0; }, hooks: {
    useState(initial) { const i = index++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], next => { cells[i] = typeof next === 'function' ? next(cells[i]) : next; }]; },
    useRef(value) { const i = index++; cells[i] ??= { current: value }; return cells[i]; }, useEffect(fn) { fn(); }, useId: () => 'synthetic-id',
  } };
}
function stepFixture(value = record(), submitImpl, readImpl) {
  const state = hookState(), results = [], revisions = []; let options, pending = false, guardBusy = false;
  const { StoreReviewStep } = load(root + 'review/StoreReviewStep.tsx', {
    react: state.hooks, '@tanstack/react-query': { useMutation(opts) { options = opts; return { isPending: pending, async mutateAsync() { pending = true; try { return await opts.mutationFn(); } finally { pending = false; } } }; } },
    '../../../../design-system': { Alert: 'Alert', Button: 'Button' }, '../../../../i18n/i18n': { useI18n: () => ({ t: translator(), lang: 'ru' }) },
    '../../model': stores, '../model': model, '../errors': errors, '../plan/PlanPreview': { PlanPreview: 'PlanPreview' },
    '../plan/useUnsavedPlan': { useUnsavedPlan(_dirty, busy) { guardBusy = busy; return { blocker: { state: 'unblocked' } }; } },
    '../plan/UnsavedPlanDialog': { UnsavedPlanDialog: 'Dialog' }, './model': review,
    './submit': { submitReviewed: submitImpl ?? (async () => ({ record: submitted(), outcome: 'submitted', reason: 'success' })), readSubmission: readImpl ?? (async () => { throw new errors.RequestFailure('unresolved'); }) },
    './SubmitDialog': { SubmitDialog: 'SubmitDialog' }, '../StoreRequestPage.module.css': {}, './Review.module.css': {},
  });
  return { render() { state.reset(); return StoreReviewStep({ record: value, onRevision: revision => { revisions.push(revision); value = { ...value, revision }; }, onResult: result => { results.push(result); value = result.record; } }); },
    get options() { return options; }, get guardBusy() { return guardBusy; }, results, revisions };
}
test('actual review UI shows four blocks, both safe previews and every failing check link', () => {
  const tree = stepFixture().render(); assert.equal(nodes(tree).filter(n => n.type === 'PlanPreview').length, 2); assert.equal(button(tree, 'Отправить владельцу').props.disabled, false);
  assert.equal(nodes(tree).filter(n => n.type === 'li' && n.props['data-valid'] === true).length, 12);
  const invalid = stepFixture(record({ name: '', plan: null, zones: [] })).render(); assert.equal(button(invalid, 'Отправить владельцу').props.disabled, true);
  for (const row of nodes(invalid).filter(n => n.type === 'li' && n.props['data-valid'] === false)) assert.ok(nodes(row).some(n => n.type === 'Button' && n.props.href.startsWith('/admin/stores/new/' + id)));
});
test('rejected comment, pending date, approved link and other-admin read-only states', () => {
  const rejected = stepFixture(record({ status: 'rejected', review_comment: 'Synthetic comment' })).render(); assert.match(JSON.stringify(rejected), /Synthetic comment/); assert.ok(button(rejected, 'Отправить владельцу'));
  const pending = stepFixture(submitted()).render(); assert.match(JSON.stringify(pending), /Asia\/Almaty/); assert.match(JSON.stringify(pending), /Заявка ожидает решения владельца/);
  const approved = stepFixture(record({ status: 'approved', published_store_id: id })).render(); assert.equal(button(approved, 'Открыть магазин').props.href, '/admin/stores/' + id);
  const foreignInvalid = stepFixture(record({ is_mine: false, name: '', plan: null, zones: [] })).render();
  for (const tree of [pending, approved, stepFixture(record({ is_mine: false })).render(), foreignInvalid]) { assert.equal(button(tree, 'Отправить владельцу'), undefined); assert.equal(button(tree, 'Изменить'), undefined); }
  assert.equal(nodes(foreignInvalid).some(n => n.type === 'Button' && n.props.href?.startsWith('/admin/stores/new/')), false);
});
test('confirmation required, synchronous double click locked, retry disabled and success refreshes UI', async () => {
  let resolve, calls = 0;
  const f = stepFixture(record(), (_value, revision) => { calls++; revision(5); return new Promise(done => { resolve = done; }); });
  button(f.render(), 'Отправить владельцу').props.onClick(); assert.equal(calls, 0);
  const dialog = nodes(f.render()).find(n => n.type === 'SubmitDialog'); dialog.props.onConfirm(); dialog.props.onConfirm();
  assert.equal(calls, 1); assert.equal(f.options.retry, false); assert.equal(f.options.networkMode, 'always'); assert.deepEqual(f.revisions, [5]);
  assert.equal(nodes(f.render()).find(n => n.type === 'SubmitDialog').props.busy, true); assert.equal(f.guardBusy, true);
  resolve({ record: submitted(), outcome: 'submitted', reason: 'success' }); await tick();
  assert.equal(button(f.render(), 'Отправить владельцу'), undefined); assert.equal(f.results.length, 1); assert.match(JSON.stringify(f.render()), /успешно отправлена/);
});
test('unresolved outcome blocks all new writes, failed read remains blocked, confirmed recheck succeeds', async () => {
  let reads = 0;
  const f = stepFixture(record(), async () => { throw new errors.RequestFailure('unresolved'); }, async () => { reads++; if (reads === 1) throw new errors.RequestFailure('unresolved'); return { record: submitted(), outcome: 'submitted', reason: 'unknown' }; });
  button(f.render(), 'Отправить владельцу').props.onClick(); nodes(f.render()).find(n => n.type === 'SubmitDialog').props.onConfirm(); await tick();
  assert.equal(button(f.render(), 'Отправить владельцу').props.disabled, true);
  button(f.render(), 'Проверить состояние заявки').props.onClick(); await tick(); assert.equal(button(f.render(), 'Отправить владельцу').props.disabled, true);
  button(f.render(), 'Проверить состояние заявки').props.onClick(); await tick(); assert.equal(button(f.render(), 'Отправить владельцу'), undefined);
});
test('form errors link to the right step; conflicts explain review instead of success', async () => {
  for (const kind of ['invalid_store', 'invalid_plan', 'invalid_zones', 'invalid_assignments']) {
    const f = stepFixture(record(), async () => { throw new errors.RequestFailure(kind); }); button(f.render(), 'Отправить владельцу').props.onClick(); nodes(f.render()).find(n => n.type === 'SubmitDialog').props.onConfirm(); await tick();
    const alert = nodes(f.render()).find(n => n.type === 'Alert' && n.props.tone === 'danger'); assert.equal(alert.props.action.props.href, model.requestPath(id, review.errorStep(kind)));
  }
  const f = stepFixture(record(), async () => ({ record: record({ revision: 7 }), outcome: 'changed', reason: 'revision_conflict' }));
  button(f.render(), 'Отправить владельцу').props.onClick(); nodes(f.render()).find(n => n.type === 'SubmitDialog').props.onConfirm(); await tick(); assert.match(JSON.stringify(f.render()), /Данные изменились/);
});
test('confirmation content mentions production and locking, with cancel focus and busy Escape protection', () => {
  let cancelled = 0, previousFocused = 0, cancelFocused = 0, closed = 0, opened = 0, cleanup;
  const previous = { isConnected: true, focus() { previousFocused++; } };
  const dialog = { showModal() { opened++; }, close() { closed++; }, querySelector: () => ({ focus() { cancelFocused++; } }) };
  const { SubmitDialog } = load(root + 'review/SubmitDialog.tsx', { react: { useId: () => 'title', useRef: () => ({ current: dialog }), useEffect(fn) { cleanup = fn(); } },
    '../../../../design-system': { Button: 'Button' }, '../../../../i18n/i18n': { useI18n: () => ({ t: translator() }) }, '../plan/StorePlan.module.css': {}, './Review.module.css': {} },
    { document: { activeElement: previous }, HTMLElement: class { static [Symbol.hasInstance](value) { return value === previous; } } });
  let tree = SubmitDialog({ name: 'Synthetic', busy: true, onCancel: () => cancelled++, onConfirm() {} });
  assert.match(JSON.stringify(tree), /production/); assert.match(JSON.stringify(tree), /заблокировано/); assert.equal(opened, 1); assert.equal(cancelFocused, 1);
  tree.props.onCancel({ preventDefault() {} }); assert.equal(cancelled, 0); assert.equal(button(tree, 'Отправить владельцу').props.disabled, true); cleanup(); assert.equal(closed, 1); assert.equal(previousFocused, 1);
  tree = SubmitDialog({ name: 'Synthetic', busy: false, onCancel: () => cancelled++, onConfirm() {} }); tree.props.onCancel({ preventDefault() {} }); assert.equal(cancelled, 1);
});
test('compact zone preview is safe, read-only and translated; no production bypass or owner RPC introduced', () => {
  const keys = obj => Object.entries(obj).flatMap(([key, value]) => typeof value === 'object' ? keys(value).map(child => key + '.' + child) : [key]).sort();
  for (const lang of ['ru', 'kk', 'en']) {
    assert.deepEqual(keys(JSON.parse(read(`src/i18n/adminStoreReview.${lang}.json`))), keys(JSON.parse(read('src/i18n/adminStoreReview.ru.json'))));
    assert.doesNotMatch(translator(lang)('adminStoreRequest.steps.review'), /\?/);
    const { PlanPreview } = load(root + 'plan/PlanPreview.tsx', { react: React, '../../../../design-system': { Button: ({ children, size: _s, variant: _v, ...p }) => React.createElement('button', p, children) },
      '../../../../i18n/i18n': { useI18n: () => ({ t: translator(lang) }) }, './StorePlan.module.css': { compact: 'compact' } });
    const html = renderToStaticMarkup(React.createElement(PlanPreview, { plan: plain(plan.EXAMPLE_PLAN), compact: true, coloring: { colors: new Map([['A-1', '#22AA55']]), labels: new Map([['A-1', '<script>zone</script>']]), unassigned: 'Unassigned' } }));
    assert.doesNotMatch(html, /<script>|aria-pressed|adminStorePlan\./); assert.match(html, /&lt;script&gt;/); assert.match(html, /compact/); assert.match(html, /#22AA55/);
  }
  for (const name of ['api.ts', 'submit.ts', 'model.ts', 'StoreReviewStep.tsx', 'SubmitDialog.tsx']) assert.doesNotMatch(read(root + 'review/' + name), /innerHTML|owner_approve_store_request|owner_reject_store_request|\.from\(|\.update\(|\.insert\(/);
  assert.equal(read('src/routes.tsx').split("path: 'stores/new/:requestId'").length - 1, 1);
});
