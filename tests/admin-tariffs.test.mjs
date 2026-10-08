import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { createElement, useId } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Synthetic data only; no env files, HTTP, database accounts or new test dependencies.
const require = createRequire(import.meta.url);
function load(file, modules = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, URLSearchParams, require: name => {
    if (name === 'react/jsx-runtime') return require(name);
    if (name in modules) return modules[name];
    throw new Error('Unexpected dependency: ' + name);
  } }, { filename: file });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const model = load('src/admin/tariffs/model.ts');
const prices = load('src/admin/campaigns/details/model.ts', { '../model': {}, '../../overview/model': {} });
const dictionary = JSON.parse(readFileSync(new URL('../src/i18n/adminTariffs.ru.json', import.meta.url), 'utf8'));
const t = (key, values = {}) => {
  const text = key.startsWith('adminTariffs.') ? key.slice(13).split('.').reduce((node, part) => node?.[part], dictionary) ?? key : key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll('{' + name + '}', String(value)), text);
};
const row = (id = 'tariff-1', overrides = {}) => ({ id, name: 'Synthetic tariff', code: null, price_per_play: 0.125, min_amount: 0,
  version: 0, purchasable: false, is_archived: false, updated_at: '2026-01-01T00:00:00Z', can_select_store: true, can_select_zone: false,
  has_sound: false, exclusive_zone: false, more_plays: true, badge: null, sort_order: 0, ...overrides });
const selection = (archived = 'all', purchasable = 'all', page = 1) => ({ filters: { archived, purchasable }, page, error: false });
const signal = () => new AbortController().signal;
const response = (data, count = data.length) => ({ data, count, error: null, status: 200 });
function backend(responses) {
  const requests = [];
  const supabase = { requireSupabase: () => ({ from(table) {
    const request = { table, calls: [] }; requests.push(request);
    const result = responses.shift();
    const builder = { then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
    for (const method of ['select', 'eq', 'order', 'range', 'abortSignal']) builder[method] = (...args) => { request.calls.push([method, ...args]); return builder; };
    return builder;
  } }) };
  return { requests, api: load('src/admin/tariffs/api.ts', { '../../lib/supabase': supabase, './model': model }) };
}
const calls = (request, method) => plain(request.calls.filter(call => call[0] === method));

test('archive and purchase filters are independent; null-code, zero and fractional values survive', async () => {
  for (const archived of ['all', 'true', 'false']) for (const purchasable of ['all', 'true', 'false']) {
    const record = row('tariff-1', { is_archived: archived === 'true', purchasable: purchasable === 'true' });
    const mock = backend([response([record])]);
    const result = await mock.api.fetchTariffs(selection(archived, purchasable), signal());
    const expected = [];
    if (archived !== 'all') expected.push(['eq', 'is_archived', archived === 'true']);
    if (purchasable !== 'all') expected.push(['eq', 'purchasable', purchasable === 'true']);
    assert.deepEqual(calls(mock.requests[0], 'eq'), expected);
    assert.equal(mock.requests[0].table, 'tariffs'); assert.equal(mock.requests.length, 1);
    assert.equal(result.rows[0].code, null); assert.equal(result.rows[0].min_amount, 0); assert.equal(result.rows[0].price_per_play, 0.125);
    assert.equal(calls(mock.requests[0], 'select')[0][1].split(',').length, 16);
    assert.deepEqual(calls(mock.requests[0], 'range'), [['range', 0, 24]]);
    assert.deepEqual(calls(mock.requests[0], 'order'), [['order', 'sort_order', { ascending: true, nullsFirst: false }], ['order', 'id', { ascending: true }]]);
  }
});

test('server pagination and count fallback repeat both filters with stable ordering', async () => {
  const rows = Array.from({ length: 25 }, (_, n) => row('tariff-' + n, { is_archived: true }));
  const mock = backend([response(rows, null), response([row('next', { is_archived: true })])]);
  const result = await mock.api.fetchTariffs(selection('true', 'false', 2), signal());
  assert.equal(result.count, null); assert.equal(result.hasNext, true);
  assert.deepEqual(calls(mock.requests[0], 'range'), [['range', 25, 49]]);
  assert.deepEqual(calls(mock.requests[1], 'range'), [['range', 50, 50]]);
  assert.deepEqual(calls(mock.requests[0], 'eq'), calls(mock.requests[1], 'eq'));
  assert.deepEqual(calls(mock.requests[0], 'order'), calls(mock.requests[1], 'order'));
  const exact = backend([response(rows, 51)]);
  assert.equal((await exact.api.fetchTariffs(selection('true', 'false', 2), signal())).hasNext, true);
  assert.equal(exact.requests.length, 1);
});

test('failed, missing and denied sources differ from empty results; invalid responses are rejected', async () => {
  for (const [code, status, kind] of [['42501', 403, 'denied'], ['PGRST205', 404, 'missing'], ['', 500, 'unavailable']]) {
    await assert.rejects(backend([{ data: null, error: { code, message: 'Sensitive backend detail' }, count: null, status }]).api.fetchTariffs(selection(), signal()),
      error => error.kind === kind && !error.message.includes('Sensitive'));
  }
  assert.equal((await backend([response([])]).api.fetchTariffs(selection(), signal())).rows.length, 0);
  for (const invalid of [row('t', { min_amount: null }), row('t', { price_per_play: Infinity }), row('t', { purchasable: 'false' })]) {
    await assert.rejects(backend([response([invalid])]).api.fetchTariffs(selection(), signal()), error => error.kind === 'invalid');
  }
  await assert.rejects(backend([response([row('t', { is_archived: true })])]).api.fetchTariffs(selection('false'), signal()), error => error.kind === 'invalid');
  await assert.rejects(backend([response([row()], 30)]).api.fetchTariffs(selection(), signal()), error => error.kind === 'invalid');
});

test('URL defaults to non-archived without hiding unavailable purchase; filter changes reset the page', async () => {
  const initial = model.readSelection(new URLSearchParams());
  assert.deepEqual(plain(initial), selection('false', 'all'));
  const changed = model.selectionParams(new URLSearchParams('archived=true&purchasable=false&page=4'), { archived: 'all', purchasable: 'true' });
  assert.deepEqual(plain(model.readSelection(changed)), selection('all', 'true'));
  assert.deepEqual(plain(model.readSelection(model.selectionParams(changed, { archived: 'all', purchasable: 'true' }, 3))), selection('all', 'true', 3));
  for (const text of ['archived=0', 'purchasable=unknown', 'page=0', 'page=1.5', 'archived=true&archived=false', 'page=1&page=2']) {
    const selected = model.readSelection(new URLSearchParams(text));
    assert.equal(selected.error, true, text);
    const mock = backend([]);
    await assert.rejects(mock.api.fetchTariffs(selected, signal()), error => error.kind === 'invalid');
    assert.equal(mock.requests.length, 0);
  }
});

test('existing KZT formatter preserves fractional prices/minimums and zero in all UI languages', () => {
  for (const lang of ['ru', 'kk', 'en']) {
    assert.equal(prices.unitPrice(0, lang, 'missing').replace(/\s/g, ''), lang === 'en' ? '₸0' : '0₸');
    assert.equal(prices.unitPrice(0.125, lang, 'missing').replace(/\s/g, ''), lang === 'en' ? '₸0.125' : '0,125₸');
    assert.equal(prices.unitPrice(1234.5678, lang, 'missing').replace(/\s/g, ''), lang === 'en' ? '₸1,234.5678' : '1234,5678₸');
  }
});

test('table shows missing code, independent flags and safe expandable parameters without changing records', () => {
  let expanded = false;
  let toggle;
  const table = load('src/admin/tariffs/TariffTable.tsx', {
    react: { useId, useState: () => [expanded, updater => { expanded = updater(expanded); }] },
    '../../design-system': {
      Badge: ({ children }) => createElement('span', null, children),
      Button: ({ size: _size, variant: _variant, children, ...props }) => { toggle = props.onClick; return createElement('button', props, children); },
    },
    '../../i18n/i18n': { useI18n: () => ({ t, lang: 'ru' }) }, '../campaigns/details/model': prices,
    '../overview/model': { overviewDate: value => value }, './model': model,
    './TariffHistory': { TariffHistory: () => null },
    '../corporate-requests/CorporateRequestsPage.module.css': {}, './TariffsPage.module.css': {},
  });
  const record = row('t', { name: '<b>Tariff</b>', badge: '<script>unsafe</script>', is_archived: true, purchasable: false });
  const render = () => renderToStaticMarkup(createElement(table.TariffTable, { rows: [record] }));
  let markup = render();
  assert.match(markup, /Код не задан/); assert.match(markup, /0,125/); assert.match(markup, /Архивный/); assert.match(markup, /Недоступна/);
  assert.match(markup, /aria-expanded="false"/); assert.match(markup, /hidden=""/);
  assert.match(markup, /Повышенное число показов/); assert.match(markup, /&lt;script&gt;unsafe&lt;\/script&gt;/); assert.doesNotMatch(markup, /<script>|<b>Tariff/);
  toggle(); markup = render(); assert.match(markup, /aria-expanded="true"/); assert.doesNotMatch(markup, /hidden=""/);
  toggle(); assert.match(render(), /aria-expanded="false"/);
  assert.equal(record.price_per_play, 0.125); assert.equal(record.code, null); assert.equal(record.is_archived, true);
  const current = renderToStaticMarkup(createElement(table.TariffTable, { rows: [row()] }));
  assert.match(current, /Действующий/); assert.match(current, /Недоступна/);
});

test('tariff cache isolates filters/pages and invalid/sessionless requests stay disabled', () => {
  let auth = { session: { user: { id: 'synthetic-admin' } }, status: 'ready' };
  const hook = load('src/admin/tariffs/useTariffs.ts', {
    '@tanstack/react-query': { useQuery: options => options }, '../../auth/useAuthSession': { useAuthSession: () => auth }, './api': { fetchTariffs() { throw new Error('Must not run'); } },
  });
  const first = hook.useTariffs(selection('false'));
  assert.equal(first.enabled, true); assert.equal(first.retry, false);
  assert.notDeepEqual(plain(first.queryKey), plain(hook.useTariffs(selection('true', 'false', 2)).queryKey));
  assert.equal(hook.useTariffs({ ...selection(), error: true }).enabled, false);
  auth = { session: null, status: 'ready' }; assert.equal(hook.useTariffs(selection()).enabled, false);
});
