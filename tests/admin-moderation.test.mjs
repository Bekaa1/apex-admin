import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

const require = createRequire(import.meta.url);
function load(file, modules) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, AbortSignal, URLSearchParams, Date, require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name.endsWith('/statusTone')) return load('src/admin/statusTone.ts', {});
      if (name in modules) return modules[name];
      throw new Error('Unexpected dependency: ' + name);
    },
  }, { filename: file });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const listModel = load('src/admin/campaigns/model.ts', {
  '../../lib/database.types': { Constants: { public: { Enums: { ad_status: ['pending', 'active'] } } } },
  '../../cabinet/campaignStatus': { STATUS_TONE: {}, statusLabelKey: value => value },
});
const model = load('src/admin/campaigns/moderation/model.ts', { '../model': listModel });
const { createDecisionController } = load('src/admin/campaigns/moderation/controller.ts', { './model': model });
const approve = { id: uuid(1), approve: true, reasons: [], comment: '' };
const reject = { ...approve, approve: false, reasons: ['claims'], comment: '  A synthetic comment\nwith a second line  ' };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function fixture(overrides = {}) {
  const observed = { sends: [], reads: 0, denied: 0, states: [] };
  const controller = createDecisionController({
    authorize: () => null, pending: () => true,
    send: async value => { observed.sends.push(value); },
    refresh: async () => { observed.reads++; return { status: 'active' }; },
    changed: value => observed.states.push(value), denied: () => observed.denied++, ...overrides,
  });
  return { controller, observed };
}
test('rejection validates at least one known reason, trims comment and omits empty comment', () => {
  for (const reasons of [[], ['invented']]) assert.throws(() => model.decisionArgs({ ...reject, reasons }), error => error.kind === 'invalid_reasons');
  assert.deepEqual(plain(model.decisionArgs(reject)), { p_id: uuid(1), p_approve: false, p_reasons: ['claims'], p_comment: 'A synthetic comment\nwith a second line' });
  assert.deepEqual(plain(model.decisionArgs({ ...reject, reasons: ['claims', 'claims'], comment: '   ' })), { p_id: uuid(1), p_approve: false, p_reasons: ['claims'] });
  assert.deepEqual(plain(model.decisionArgs({ ...reject, approve: true })), { p_id: uuid(1), p_approve: true });
});
test('API calls only the RPC with exact parameters and transport retries disabled; ignores returned status string', async () => {
  const calls = [];
  const { moderateCampaign } = load('src/admin/campaigns/moderation/api.ts', {
    './model': model,
    '../../../lib/supabase': { requireSupabase: () => ({ rpc(name, args) {
      calls.push({ name, args }); return { retry(enabled) { assert.equal(enabled, false); return this; }, abortSignal(signal) { assert.ok(signal); return Promise.resolve({ data: 'not_a_campaign_status', error: null, status: 200 }); } };
    } }) },
  });
  assert.equal(await moderateCampaign(approve), undefined);
  assert.equal(await moderateCampaign(reject), undefined);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].name, 'admin_moderate_campaign');
  assert.deepEqual(plain(calls[0].args), plain(model.decisionArgs(approve)));
  assert.deepEqual(plain(calls[1].args), plain(model.decisionArgs(reject)));
  await assert.rejects(moderateCampaign({ ...reject, reasons: [] }), error => error.kind === 'invalid_reasons');
  assert.equal(calls.length, 2);
});
test('known server errors are classified without leaking messages', () => {
  for (const kind of ['not_authenticated', 'forbidden', 'not_found', 'invalid_status', 'invalid_reasons']) assert.equal(model.moderationIssue({ code: 'P0001', message: kind }), kind);
  assert.equal(model.moderationIssue({ code: 'PGRST202' }), 'unavailable');
  assert.equal(model.moderationIssue({}, 401), 'not_authenticated');
  assert.equal(model.moderationIssue({}, 403), 'forbidden');
  assert.equal(model.moderationIssue(new Error('network failure')), 'uncertain');
  assert.equal(model.moderationIssue({ code: '57014' }), 'uncertain');
});
test('controller blocks missing reasons and two synchronous clicks', async () => {
  const waiting = deferred(); let sends = 0;
  const { controller } = fixture({ send: async () => { sends++; await waiting.promise; } });
  await controller.submit({ ...reject, reasons: [] });
  assert.equal(sends, 0);
  assert.equal(controller.snapshot().issue, 'invalid_reasons');
  const first = controller.submit(reject);
  await controller.submit(reject);
  assert.equal(sends, 1);
  assert.equal(controller.snapshot().busy, true);
  assert.equal(controller.snapshot().succeeded, false);
  waiting.resolve(); await first;
  assert.equal(controller.snapshot().succeeded, true);
  await controller.submit(reject);
  assert.equal(sends, 1);
});
test('uncertain failure requires successful read before explicit retry and preserves decision draft', async () => {
  let sends = 0, reads = 0;
  const { controller } = fixture({
    send: async value => { assert.equal(value.comment, reject.comment); if (++sends === 1) throw new Error('timeout'); },
    refresh: async () => { if (++reads === 1) throw new Error('offline'); return { status: 'pending' }; },
  });
  await controller.submit(reject);
  assert.equal(controller.snapshot().needsRefresh, true);
  await controller.submit(reject); assert.equal(sends, 1);
  await controller.refresh(); assert.equal(controller.snapshot().issue, 'refresh_failed');
  await controller.submit(reject); assert.equal(sends, 1);
  await controller.refresh(); assert.equal(controller.snapshot().reviewed, true);
  assert.equal(controller.snapshot().needsRefresh, false);
  assert.equal(sends, 1);
  await controller.submit(reject); assert.equal(sends, 2);
});
test('uncertain operation already committed cannot be sent again after refresh', async () => {
  const { controller, observed } = fixture({ send: async () => { throw new Error('timeout'); } });
  await controller.submit(approve); await controller.refresh();
  assert.equal(controller.snapshot().issue, 'invalid_status');
  assert.equal(observed.reads, 1);
  await controller.submit(approve);
  assert.equal(observed.reads, 1);
});
test('invalid_status rereads, invalid_reasons stays editable, forbidden revokes access, unauthenticated requires login', async () => {
  for (const kind of ['invalid_status', 'invalid_reasons', 'forbidden', 'not_authenticated', 'not_found']) {
    const { controller, observed } = fixture({ send: async () => { throw new model.ModerationError(kind); } });
    await controller.submit(reject);
    assert.equal(controller.snapshot().issue, kind);
    assert.equal(observed.reads, kind === 'invalid_status' ? 1 : 0);
    assert.equal(observed.denied, kind === 'forbidden' ? 1 : 0);
    assert.equal(controller.snapshot().busy, false);
  }
});
test('success with failed reread never repeats the mutation, only the SELECT', async () => {
  let reads = 0;
  const { controller, observed } = fixture({ refresh: async () => { if (++reads === 1) throw new Error('offline'); return { status: 'awaiting_payment' }; } });
  await controller.submit(approve);
  assert.equal(controller.snapshot().succeeded, true);
  assert.equal(controller.snapshot().needsRefresh, true);
  await controller.submit(approve); assert.equal(observed.sends.length, 1);
  await controller.refresh(); assert.equal(controller.snapshot().needsRefresh, false);
  assert.equal(observed.sends.length, 1);
});
test('nonpending, revoked access and unmounted controllers cannot send or repopulate cache', async () => {
  const denied = fixture({ authorize: () => 'forbidden' });
  await denied.controller.submit(approve); assert.equal(denied.observed.sends.length, 0);
  const active = fixture({ pending: () => false });
  await active.controller.submit(approve); assert.equal(active.observed.sends.length, 0);
  const waiting = deferred();
  const gone = fixture({ send: () => waiting.promise });
  const call = gone.controller.submit(approve);
  gone.controller.dispose(); waiting.resolve(); await call;
  assert.equal(gone.observed.reads, 0);
});
test('queue fixes pending even for hostile status URL, uses ascending stable server order and page of 25', async () => {
  const selection = listModel.readSelection(new URLSearchParams('status=active&status=deleted&page=2&search=ACME'), 'moderation');
  assert.equal(selection.filters.status, 'pending'); assert.equal(selection.error, null);
  const calls = [];
  const builder = { select(...args) { calls.push(['select', ...args]); return this; }, filter(...args) { calls.push(['filter', ...args]); return this; }, or(...args) { calls.push(['or', ...args]); return this; }, order(...args) { calls.push(['order', ...args]); return this; }, range(...args) { calls.push(['range', ...args]); return this; }, abortSignal() { return Promise.resolve({ data: [], count: 25, error: null, status: 200 }); } };
  const api = load('src/admin/campaigns/api.ts', { './model': listModel, '../../lib/supabase': { requireSupabase: () => ({ from: table => { assert.equal(table, 'ads'); return builder; } }) } });
  await api.fetchCampaignPage({ ...selection, filters: { ...selection.filters, status: 'active' } }, new AbortController().signal, 'moderation');
  assert.deepEqual(plain(calls.find(value => value[0] === 'filter')), ['filter', 'status', 'eq', 'pending']);
  assert.deepEqual(plain(calls.filter(value => value[0] === 'order')), [['order', 'created_at', { ascending: true, nullsFirst: false }], ['order', 'id', { ascending: true }]]);
  assert.deepEqual(plain(calls.find(value => value[0] === 'range')), ['range', 25, 49]);
});
test('real cache gets factual status and invalidates lists/overview; slow auxiliary reads do not block it', { timeout: 3000 }, async () => {
  for (const finalStatus of ['active', 'awaiting_payment', 'budget_ended']) {
    const client = new QueryClient();
    const session = { user: { id: uuid(10) }, expires_at: Math.floor(Date.now() / 1000) + 3600 };
    const roleKey = ['apex-permissions', session.user.id, session.expires_at];
    const detailKey = ['admin', 'campaign-detail', session.user.id, uuid(1), 'record'];
    client.setQueryData(roleKey, ['moderator']); client.setQueryData(detailKey, { status: 'pending' });
    for (const key of [['admin', 'campaigns', 'all'], ['admin', 'campaigns', 'moderation'], ['admin', 'overview'], ['admin', 'campaign-detail', session.user.id, uuid(1), 'invoices']]) client.setQueryData(key, 'old');
    let options, reads = 0;
    let backgroundReads = 0;
    client.refetchQueries = () => { backgroundReads++; return new Promise(() => {}); };
    const { useModeration } = load('src/admin/campaigns/moderation/useModeration.ts', {
      react: { useEffect: fn => fn(), useState: value => [typeof value === 'function' ? value() : value, () => {}] },
      '@tanstack/react-query': { useQueryClient: () => client, useMutation: opts => { options = opts; return { mutateAsync: opts.mutationFn }; } },
      '../../../auth/permissions': load('src/auth/permissions.ts', {}),
    '../../../auth/useAuthSession': { useAuthSession: () => ({ session }) },
      '../details/api': { fetchCampaignDetail: async () => { reads++; return { status: finalStatus }; } },
      './api': { moderateCampaign: async () => {} },
      './model': model,
      './controller': { createDecisionController, INITIAL_DECISION: { busy: false, issue: null, needsRefresh: false, succeeded: false, reviewed: false } },
    });
    const { controller } = useModeration(uuid(1));
    assert.equal(options.retry, false); assert.equal(options.networkMode, 'always');
    await controller.submit(approve);
    assert.equal(reads, 1); assert.equal(client.getQueryData(detailKey).status, finalStatus);
    assert.equal(backgroundReads, 4);
    for (const key of [['admin', 'campaigns', 'all'], ['admin', 'campaigns', 'moderation'], ['admin', 'overview']]) assert.equal(client.getQueryState(key).isInvalidated, true);
    controller.dispose(); client.clear();
  }
});
test('moderation dictionaries contain exactly the same keys and six specified reasons', () => {
  const keys = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? keys(value, prefix + key + '.') : [prefix + key]).sort();
  const dicts = ['ru', 'kk', 'en'].map(lang => JSON.parse(readFileSync(new URL(`../src/i18n/adminModeration.${lang}.json`, import.meta.url))));
  assert.deepEqual(keys(dicts[0]), keys(dicts[1])); assert.deepEqual(keys(dicts[0]), keys(dicts[2]));
  assert.deepEqual(Object.keys(dicts[0].reason).sort(), [...model.REASONS].sort());
});
