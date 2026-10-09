import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

// Actual source with isolated Auth/API/hook boundaries. No env files or network.
const require = createRequire(import.meta.url);
function load(file, modules = {}) {
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, AbortSignal, URL, URLSearchParams, Intl, Date, require: name => {
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
const list = load('src/admin/invoices/model.ts');
const helpers = load('src/admin/campaigns/details/model.ts', {
  '../model': { isCampaignId: list.isInvoiceId, isCampaignRow: () => true }, '../../overview/model': { overviewDate: () => '' },
});
const details = load('src/admin/invoices/details/model.ts', { '../model': list, '../../campaigns/details/model': helpers });
const model = load('src/admin/invoices/payment/model.ts', { '../model': list });
const control = load('src/admin/invoices/payment/controller.ts', { './model': model });
const row = { id: uuid(1), user_id: uuid(2), ad_id: uuid(3), number: 127, amount: 1234.56,
  status: 'unpaid', kind: 'initial', issued_at: '2026-10-07T00:00:00Z', paid_at: null,
  file_url: null, sent_to: null, price_per_play: 0.015, tariff_version: 2, paid_by: null };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function fixture(overrides = {}, saved) {
  const observed = { sends: [], reads: 0, denied: 0, states: [] };
  const controller = control.createPaymentController({
    authorize: () => null, matches: review => details.matchesReview(row, review),
    send: async id => { observed.sends.push(id); },
    refresh: async () => { observed.reads++; return { ...row, status: 'paid' }; },
    changed: state => observed.states.push(state), denied: () => observed.denied++, ...overrides,
  }, saved);
  return { controller, observed };
}

test('payment RPC sends only invoice UUID, disables transport retries and ignores returned string', async () => {
  const calls = [];
  let fail = false;
  const api = load('src/admin/invoices/payment/api.ts', {
    './model': model, '../../../lib/supabase': { requireSupabase: () => ({ rpc(name, args) {
      calls.push({ name, args });
      return { retry(value) { assert.equal(value, false); return this; }, abortSignal(signal) {
        assert.ok(signal); return Promise.resolve(fail ? { error: { code: '57014' }, status: 503 } : { data: 'not_an_invoice_status', error: null, status: 200 });
      } };
    } }) },
  });
  assert.equal(await api.markInvoicePaid(row.id), undefined);
  assert.deepEqual(plain(calls), [{ name: 'admin_mark_invoice_paid', args: { p_invoice_id: row.id } }]);
  await assert.rejects(api.markInvoicePaid('bad-id'), error => error.kind === 'not_found');
  assert.equal(calls.length, 1);
  fail = true;
  await assert.rejects(api.markInvoicePaid(row.id), error => error.kind === 'uncertain');
  assert.equal(calls.length, 2);
});

test('sanitized errors distinguish forbidden, unauthenticated, missing RPC and changed status', () => {
  for (const kind of ['not_authenticated', 'forbidden', 'not_found', 'invalid_status']) assert.equal(model.paymentIssue({ code: 'P0001', message: kind }), kind);
  assert.equal(model.paymentIssue({}, 401), 'not_authenticated');
  assert.equal(model.paymentIssue({ code: '42501' }), 'forbidden');
  assert.equal(model.paymentIssue({ code: 'PGRST202' }), 'unavailable');
  assert.equal(model.paymentIssue(new Error('timeout')), 'uncertain');
  assert.equal(model.paymentIssue({ code: '57014' }), 'uncertain');
});

test('detail validation, HTTP(S) links and exact fractional money', () => {
  assert.equal(details.isInvoiceDetail(row), true);
  assert.equal(details.isInvoiceDetail({ ...row, amount: null, tariff_version: null }), true);
  assert.equal(details.isInvoiceDetail({ ...row, tariff_version: 1.3 }), false);
  for (const value of [null, '', '//example.invalid/a', '/local.pdf', 'javascript:alert(1)', 'data:text/plain,hello', 'https://user:pass@example.invalid/a', 'https:\\example.invalid/a', 'https://example.invalid/\nfile', 'https://example.invalid:99999/a']) assert.equal(details.invoiceFileUrl(value), null);
  assert.equal(details.invoiceFileUrl('https://example.invalid/a.pdf?x=1'), 'https://example.invalid/a.pdf?x=1');
  assert.equal(details.invoiceFileUrl('http://example.invalid/a.pdf'), 'http://example.invalid/a.pdf');
  assert.equal(details.invoiceFileUrl('https://example.invalid/a' + String.fromCharCode(0) + '.pdf'), null);
  assert.match(helpers.unitPrice(row.amount, 'en', '?'), /1,234\.56/);
  assert.match(helpers.unitPrice(row.price_per_play, 'en', '?'), /0\.015/);
  assert.equal(helpers.unitPrice(null, 'en', '?'), '?');
  for (const status of ['paid', 'cancelled', 'legacy']) assert.equal(details.canReviewPayment({ ...row, status }), false);
  assert.equal(details.canReviewPayment({ ...row, amount: null }), false);
  assert.equal(details.matchesReview(row, { ...row, amount: 100 }), false);
});

test('two synchronous clicks produce one mutation; success awaits a fresh paid record', async () => {
  const send = deferred(), read = deferred(), started = deferred();
  let calls = 0;
  const { controller } = fixture({ send: async () => { calls++; await send.promise; }, refresh: async () => { started.resolve(); return read.promise; } });
  const first = controller.submit(row);
  await controller.submit(row);
  assert.equal(calls, 1);
  assert.equal(controller.snapshot().busy, true);
  assert.equal(controller.snapshot().verified, false);
  send.resolve(); await started.promise;
  assert.equal(controller.snapshot().acknowledged, true);
  assert.equal(controller.snapshot().verified, false);
  read.resolve({ ...row, status: 'paid' }); await first;
  assert.equal(controller.snapshot().verified, true);
  assert.equal(controller.snapshot().busy, false);
  await controller.submit(row); assert.equal(calls, 1);
});

test('timeout triggers automatic read; already paid is displayed without a second mutation', async () => {
  let calls = 0;
  const { controller, observed } = fixture({ send: async () => { calls++; throw new Error('network disconnected'); } });
  await controller.submit(row);
  assert.equal(observed.reads, 1);
  assert.equal(controller.snapshot().verified, true);
  assert.equal(controller.snapshot().acknowledged, false);
  assert.equal(controller.snapshot().issue, null);
  await controller.submit(row); assert.equal(calls, 1);
});

test('failed reconciliation and later unpaid both keep financial resubmission blocked', async () => {
  let calls = 0, reads = 0;
  const { controller } = fixture({
    send: async () => { calls++; throw new Error('timeout'); },
    refresh: async () => { if (++reads === 1) throw new Error('offline'); return { ...row, status: reads === 2 ? 'unpaid' : 'paid' }; },
  });
  await controller.submit(row);
  assert.equal(controller.snapshot().issue, 'refresh_failed');
  assert.equal(controller.snapshot().needsRefresh, true);
  await controller.submit(row); assert.equal(calls, 1);
  await controller.refresh();
  assert.equal(controller.snapshot().issue, 'uncertain');
  await controller.submit(row); assert.equal(calls, 1);
  await controller.refresh();
  assert.equal(controller.snapshot().verified, true);
  assert.equal(reads, 3); assert.equal(calls, 1);
});

test('RPC success is not paid when read fails or still returns unpaid', async () => {
  const { controller, observed } = fixture({ refresh: async () => ({ ...row, status: 'unpaid' }) });
  await controller.submit(row);
  assert.equal(controller.snapshot().issue, 'unverified');
  assert.equal(controller.snapshot().verified, false);
  await controller.submit(row); assert.equal(observed.sends.length, 1);
  const failed = fixture({ refresh: async () => { throw new Error('offline'); } });
  await failed.controller.submit(row);
  assert.equal(failed.controller.snapshot().issue, 'refresh_failed');
  assert.equal(failed.controller.snapshot().verified, false);
});

test('stale review or non-unpaid status does not send; explicit review can use freshly read values', async () => {
  const { controller, observed } = fixture({ matches: () => false, refresh: async () => row });
  await controller.submit({ ...row, amount: 100 });
  assert.equal(observed.sends.length, 0);
  assert.equal(controller.snapshot().issue, 'changed');
  assert.equal(controller.snapshot().attempted, false);
  controller.review(); assert.equal(controller.snapshot().issue, null);
  await controller.refresh(); assert.equal(controller.snapshot().issue, null);
});

test('forbidden closes access, unauthenticated requires login, invalid_status reads the record', async () => {
  for (const kind of ['forbidden', 'not_authenticated', 'not_found', 'invalid_status']) {
    const { controller, observed } = fixture({ send: async () => { throw new model.PaymentError(kind); },
      refresh: async () => { observed.reads++; return { ...row, status: 'cancelled' }; } });
    await controller.submit(row);
    assert.equal(controller.snapshot().issue, kind);
    assert.equal(observed.denied, kind === 'forbidden' ? 1 : 0);
    assert.equal(observed.reads, kind === 'invalid_status' ? 1 : 0);
  }
  const forbidden = fixture({ authorize: () => 'forbidden' });
  await forbidden.controller.submit(row); assert.equal(forbidden.observed.sends.length, 0);
});

test('unmount and cache restoration retain attempt lock; late response does not read or repopulate state', async () => {
  const waiting = deferred();
  const first = fixture({ send: () => waiting.promise });
  const pending = first.controller.submit(row);
  const saved = first.controller.snapshot();
  first.controller.dispose();
  const restored = fixture({}, saved);
  assert.equal(restored.controller.snapshot().busy, false);
  assert.equal(restored.controller.snapshot().issue, 'uncertain');
  await restored.controller.submit(row); assert.equal(restored.observed.sends.length, 0);
  waiting.resolve(); await pending;
  assert.equal(first.observed.reads, 0);
  await restored.controller.refresh(); assert.equal(restored.controller.snapshot().verified, true);
});

test('hook disables mutation retries and invalidates invoice/campaign/portions/overview caches after success', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const session = { user: { id: uuid(8) }, expires_at: Math.floor(Date.now() / 1000) + 3600 };
  const roleKey = ['apex-permissions', session.user.id, session.expires_at];
  const recordKey = ['admin', 'invoice-detail', session.user.id, row.id, 'record'];
  client.setQueryData(roleKey, ['accountant']); client.setQueryData(recordKey, row);
  const related = [['admin', 'invoices', session.user.id], ['admin', 'campaigns'], ['admin', 'overview'], ['admin', 'audit'],
    ...['record', 'invoices', 'portions'].map(kind => ['admin', 'campaign-detail', session.user.id, row.ad_id, kind])];
  related.forEach(key => client.setQueryData(key, 'old'));
  let reads = 0, sends = 0, options;
  const readApi = load('src/admin/invoices/api.ts', { '../../lib/supabase': {}, './model': list });
  const cache = load('src/admin/invoices/payment/cache.ts', {
    '../details/api': { fetchInvoiceDetail: async id => { assert.equal(id, row.id); reads++; return { ...row, status: 'paid' }; } },
    '../api': readApi, './model': model,
  });
  // Slow auxiliary refreshes must not hold the main invoice result.
  const backgrounds = [];
  client.refetchQueries = async options => { backgrounds.push(options.queryKey); return new Promise(() => {}); };
  const hook = load('src/admin/invoices/payment/usePayment.ts', {
    react: { useEffect: fn => fn(), useState: value => [typeof value === 'function' ? value() : value, () => {}] },
    '@tanstack/react-query': { useQueryClient: () => client, useMutation: value => { options = value; return { mutateAsync: value.mutationFn }; } },
    '../../../auth/permissions': load('src/auth/permissions.ts', {}),
    '../../../auth/useAuthSession': { useAuthSession: () => ({ session }) },
    '../details/model': details, './api': { markInvoicePaid: async id => { assert.equal(id, row.id); sends++; } },
    './cache': cache, './controller': control, './model': model,
  });
  const { controller } = hook.usePayment(row.id);
  assert.equal(options.retry, false); assert.equal(options.networkMode, 'always');
  await controller.submit(row);
  assert.equal(sends, 1); assert.equal(reads, 1);
  assert.equal(client.getQueryData(recordKey).status, 'paid');
  related.forEach(key => assert.equal(client.getQueryState(key).isInvalidated, true));
  assert.equal(backgrounds.length, 6);
  const saved = client.getQueryData(['admin', 'invoice-payment', session.user.id, row.id]);
  assert.equal(saved.attempted, true); assert.equal(saved.verified, true);
  const second = hook.usePayment(row.id);
  await second.controller.submit(row); assert.equal(sends, 1);
  controller.dispose(); second.controller.dispose(); client.clear();
  assert.equal(client.getQueryData(['admin', 'invoice-payment', session.user.id, row.id]), undefined);
});

test('detail API reads only advertiser_invoices; bad UUID makes no request; denied does not become null', async () => {
  let response = { data: row, error: null, status: 200 }, calls = 0;
  const client = { from(table) {
    calls++; assert.equal(table, 'advertiser_invoices');
    return { select(columns) { assert.ok(columns.includes('paid_by')); return this; }, eq(column, value) { assert.equal(column, 'id'); assert.equal(value, row.id); return this; }, abortSignal(signal) { assert.ok(signal); return this; }, maybeSingle: async () => response };
  } };
  const readApi = load('src/admin/invoices/api.ts', { '../../lib/supabase': { requireSupabase: () => client }, './model': list });
  const api = load('src/admin/invoices/details/api.ts', { '../../../lib/supabase': { requireSupabase: () => client }, '../api': readApi, '../model': list, './model': details });
  assert.equal((await api.fetchInvoiceDetail(row.id, new AbortController().signal)).id, row.id);
  await assert.rejects(api.fetchInvoiceDetail('no', new AbortController().signal)); assert.equal(calls, 1);
  response = { data: null, error: { code: '42501' }, status: 403 };
  await assert.rejects(api.fetchInvoiceDetail(row.id, new AbortController().signal), error => error.kind === 'denied');
  response = { data: null, error: null, status: 200 };
  assert.equal(await api.fetchInvoiceDetail(row.id, new AbortController().signal), null);
});

test('reconciliation stops on lost authorization and denies a forbidden invoice read', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const readApi = load('src/admin/invoices/api.ts', { '../../lib/supabase': {}, './model': list });
  let calls = 0;
  const cache = load('src/admin/invoices/payment/cache.ts', {
    '../details/api': { fetchInvoiceDetail: async () => { calls++; throw new readApi.InvoiceReadError('denied'); } },
    '../api': readApi, './model': model,
  });
  await assert.rejects(cache.refreshInvoiceCaches(client, uuid(8), row.id, () => 'not_authenticated'), error => error.kind === 'not_authenticated');
  assert.equal(calls, 0);
  await assert.rejects(cache.refreshInvoiceCaches(client, uuid(8), row.id, () => null), error => error.kind === 'forbidden');
  assert.equal(calls, 1);
  client.clear();
});

function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  const children = element.props?.children;
  return [element, ...[children].flat(Infinity).flatMap(nodes)];
}
test('invoice UI hides payment for paid/cancelled and opens only safe files with noreferrer', () => {
  const { InvoiceFields } = load('src/admin/invoices/details/InvoiceFields.tsx', {
    'react-router': { Link: 'Link' }, '../../../design-system': { Alert: 'Alert', Badge: 'Badge', Button: 'Button' },
    '../../../i18n/i18n': { useI18n: () => ({ t: key => key, lang: 'en' }) }, '../../overview/model': { overviewDate: () => 'date' },
    '../../campaigns/details/DetailState': { DetailField: 'DetailField' }, '../../campaigns/details/model': helpers,
    '../api': {}, '../model': list, './model': details,
    './useInvoiceDetail': { useInvoiceDetailQuery: () => ({ isPending: false, isError: true, refetch() {} }) },
    '../../campaigns/details/CampaignDetail.module.css': {}, './InvoiceDetail.module.css': {},
  });
  for (const status of ['paid', 'cancelled', 'legacy']) {
    const elements = nodes(InvoiceFields({ row: { ...row, status }, canOpen: true, onOpen() {} }));
    assert.equal(elements.some(node => node.type === 'Button' && node.props.children === 'adminInvoiceDetail.pay'), false);
  }
  const elements = nodes(InvoiceFields({ row: { ...row, file_url: 'https://example.invalid/a.pdf' }, canOpen: false, onOpen() {} }));
  const button = elements.find(node => node.type === 'Button' && node.props.children === 'adminInvoiceDetail.pay');
  assert.equal(button.props.disabled, true);
  const link = elements.find(node => node.type === 'a');
  assert.equal(link.props.target, '_blank'); assert.equal(link.props.rel, 'noopener noreferrer');
  assert.equal(elements.find(node => node.type === 'Link').props.to, `/admin/campaigns/${row.ad_id}`);
});

test('payment dialog has an explicit confirmation button and cannot re-submit after an uncertain attempt', () => {
  const { PaymentDialog } = load('src/admin/invoices/payment/PaymentDialog.tsx', {
    react: { useEffect() {}, useId: () => 'synthetic-id', useRef: () => ({ current: null }) },
    '../../../design-system': { Button: 'Button' }, '../../../i18n/i18n': { useI18n: () => ({ t: key => key, lang: 'en' }) },
    '../../campaigns/details/model': helpers, './PaymentFeedback': { PaymentFeedback: 'PaymentFeedback' },
    '../../campaigns/moderation/Moderation.module.css': {}, '../details/InvoiceDetail.module.css': {},
  });
  const props = { summary: { ...row, client: 'Synthetic client', campaign: 'Synthetic campaign' }, state: control.INITIAL_PAYMENT, current: true, onConfirm() {}, onRefresh() {}, onClose() {} };
  const confirm = nodes(PaymentDialog(props)).find(node => node.type === 'Button' && node.props.children === 'adminInvoiceDetail.confirm');
  assert.equal(confirm.props.disabled, false);
  assert.equal(nodes(PaymentDialog({ ...props, state: { ...props.state, attempted: true, issue: 'refresh_failed' } })).some(node => node.props?.children === 'adminInvoiceDetail.confirm'), false);
});

test('all invoice detail dictionaries have matching keys; new route remains below the existing guard', () => {
  const keys = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? keys(value, prefix + key + '.') : [prefix + key]).sort();
  const dicts = ['ru', 'kk', 'en'].map(lang => JSON.parse(readFileSync(new URL(`../src/i18n/adminInvoiceDetail.${lang}.json`, import.meta.url))));
  assert.deepEqual(keys(dicts[0]), keys(dicts[1])); assert.deepEqual(keys(dicts[0]), keys(dicts[2]));
  const routes = readFileSync(new URL('../src/routes/admin.tsx', import.meta.url), 'utf8');
  assert.equal((routes.match(/element: <RequireAdmin\s/g) ?? []).length, 1);
  assert.ok(routes.indexOf("path: 'invoices/:id'") > routes.indexOf('element: <RequireAdmin'));
  assert.ok(routes.includes("import('../admin/invoices/details/InvoiceDetailPage')"));
});
