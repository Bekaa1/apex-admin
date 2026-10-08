import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Synthetic backend only. No environment, network or production data is loaded.
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
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const signal = () => new AbortController().signal;
const response = (data, count = data.length) => ({ data, count, error: null, status: 200 });
const storeModel = load('src/admin/stores/model.ts');
const model = load('src/admin/stores/details/model.ts', { '../model': storeModel });
const enums = load('src/lib/database.types.ts');
const equipmentModel = load('src/admin/equipment/model.ts', { '../../lib/database.types': enums, '../stores/model': storeModel, '../stores/details/model': model });
const cart = (n, store = id(1)) => ({ id: id(100 + n), store_id: store, cart_number: '00' + n, display_id: n, status: 'active', battery_level: 0,
  last_seen_at: null, last_ping_at: null, current_zone_id: null });
const beacon = (n, store = id(1)) => ({ id: id(200 + n), store_id: store, box_number: '004', device_identifier: 'device-' + n, status: 'legacy_state', zone_id: null });
const selection = (tab, filters = {}, page = 1) => ({ tab, filters: { ...equipmentModel.emptyFilters(), ...filters }, page, error: false });
function backend(responses = {}) {
  const requests = [];
  const client = { from(table) {
    const request = { table, calls: [] }; requests.push(request);
    const result = responses[table]?.shift();
    const builder = { then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); } };
    for (const method of ['select', 'eq', 'or', 'filter', 'order', 'range', 'in', 'is', 'limit', 'abortSignal', 'maybeSingle']) {
      builder[method] = (...args) => { request.calls.push([method, ...args]); return builder; };
    }
    return builder;
  } };
  const supabase = { requireSupabase: () => client };
  const storeApi = load('src/admin/stores/api.ts', { '../../lib/supabase': supabase, './model': storeModel });
  const detailApi = load('src/admin/stores/details/api.ts', { '../../../lib/supabase': supabase, '../api': storeApi, '../model': storeModel, './model': model });
  const api = load('src/admin/equipment/api.ts', { '../../lib/supabase': supabase, '../stores/api': storeApi, '../stores/model': storeModel,
    '../stores/details/api': detailApi, '../stores/details/model': model, './model': equipmentModel });
  return { requests, api, detailApi, storeApi };
}
const calls = (request, method) => plain(request.calls.filter(call => call[0] === method));

test('store card keeps store scope on zones, equipment pages, count fallback and zone names', async () => {
  for (const tab of ['zones', 'carts', 'beacons']) {
    const rows = Array.from({ length: 25 }, (_, n) => tab === 'zones' ? { id: id(300 + n), name: 'Zone', description: null, store_id: id(1) }
      : tab === 'carts' ? { ...cart(n), current_zone_id: id(9) } : { ...beacon(n), zone_id: id(9) });
    const responses = { [tab]: [response(rows, null), response([])] };
    if (tab !== 'zones') responses.zones = [response([{ id: id(9), store_id: id(1), name: 'Zone' }])];
    const mock = backend(responses);
    const result = await mock.detailApi.fetchStoreRecords(id(1), { tab, page: 1, withoutZone: false, error: false }, signal());
    assert.equal(result.data.rows.length, 25);
    assert.equal(result.data.hasNext, false);
    assert.equal(mock.requests.length, tab === 'zones' ? 2 : 3);
    for (const request of mock.requests) assert.deepEqual(calls(request, 'eq'), [['eq', 'store_id', id(1)]]);
    assert.deepEqual(calls(mock.requests[0], 'range'), [['range', 0, 24]]);
    assert.deepEqual(calls(mock.requests[1], 'range'), [['range', 25, 25]]);
    assert.equal(calls(mock.requests[0], 'order').at(-1)[1], 'id');
  }
});

test('invalid or missing card scope cannot widen to all stores; wrong-store response is rejected', async () => {
  for (const invalid of ['', undefined, 'not-a-uuid']) {
    const mock = backend();
    await assert.rejects(mock.detailApi.fetchStoreRecords(invalid, { tab: 'carts', page: 1, withoutZone: false, error: false }, signal()), e => e.kind === 'invalid');
    await assert.rejects(mock.detailApi.fetchDeviceRecords({ scope: { kind: 'store', id: invalid }, tab: 'carts', page: 1, search: '', status: '', withoutZone: false }, signal()), e => e.kind === 'invalid');
    assert.equal(mock.requests.length, 0);
  }
  for (const tab of ['carts', 'beacons']) {
    const mock = backend({ [tab]: [response([tab === 'carts' ? cart(1, id(2)) : beacon(1, id(2))])] });
    await assert.rejects(mock.detailApi.fetchStoreRecords(id(1), { tab, page: 1, withoutZone: false, error: false }, signal()), e => e.kind === 'invalid');
  }
});

test('explicit global mode accepts multiple/unassigned stores and does bounded batch name lookups', async () => {
  const rows = [{ ...cart(1), current_zone_id: id(9) }, { ...cart(2, id(2)), current_zone_id: id(10) }, cart(3, null)];
  const mock = backend({ carts: [response(rows)], zones: [response([{ id: id(9), store_id: id(1), name: 'Zone A' }, { id: id(10), store_id: id(2), name: 'Zone B' }])],
    stores: [response([{ id: id(1), name: 'Store A' }, { id: id(2), name: 'Store B' }])] });
  const result = await mock.api.fetchEquipment(selection('carts'), signal());
  assert.equal(result.records.data.rows.length, 3);
  assert.equal(result.records.data.rows[1].zoneName, 'Zone B');
  assert.equal(result.stores[id(2)], 'Store B');
  assert.deepEqual(mock.requests.map(r => r.table), ['carts', 'zones', 'stores']);
  assert.deepEqual(calls(mock.requests[0], 'eq'), []);
  assert.deepEqual(calls(mock.requests[1], 'in'), [['in', 'id', [id(9), id(10)]]]);
  assert.deepEqual(calls(mock.requests[2], 'in'), [['in', 'id', [id(1), id(2)]]]);
  for (const request of mock.requests.slice(1)) assert.deepEqual(calls(request, 'limit'), [['limit', 25]]);
});

test('global store/search/status filters and beacon IS NULL also constrain next-page probes', async () => {
  for (const tab of ['carts', 'beacons']) {
    const rows = Array.from({ length: 25 }, (_, n) => tab === 'carts' ? cart(n) : beacon(n));
    const mock = backend({ [tab]: [response(rows, null), response([])], stores: [response([{ id: id(1), name: 'Store' }])] });
    await mock.api.fetchEquipment(selection(tab, { search: '004', storeId: id(1), status: tab === 'carts' ? 'active' : 'legacy_state', withoutZone: tab === 'beacons' }, 2), signal());
    const [first, probe] = mock.requests;
    for (const request of [first, probe]) {
      assert.ok(calls(request, 'eq').some(call => call[1] === 'store_id' && call[2] === id(1)));
      if (tab === 'carts') assert.deepEqual(calls(request, 'filter'), [['filter', 'cart_number', 'imatch', '004'], ['filter', 'status', 'eq', 'active']]);
      else {
        assert.deepEqual(calls(request, 'is'), [['is', 'zone_id', null]]);
        assert.ok(calls(request, 'eq').some(call => call[1] === 'status' && call[2] === 'legacy_state'));
        assert.deepEqual(calls(request, 'or'), [['or', 'box_number.imatch."004",device_identifier.imatch."004"']]);
      }
    }
    assert.deepEqual(calls(first, 'range'), [['range', 25, 49]]);
    assert.deepEqual(calls(probe, 'range'), [['range', 50, 50]]);
  }
});

test('search is quoted as a literal and string box numbers survive the adapter', async () => {
  const mock = backend({ beacons: [response([beacon(1, null)])] });
  const input = '004",status.eq.active),x.*%\\';
  const quoted = JSON.stringify(storeModel.storeNamePattern(input));
  assert.equal(mock.detailApi.beaconSearchFilter(input), `box_number.imatch.${quoted},device_identifier.imatch.${quoted}`);
  const result = await mock.api.fetchEquipment(selection('beacons', { search: input }), signal());
  assert.equal(result.records.data.rows[0].box_number, '004');
});

test('errors stay distinct from empty data; unavailable names do not remove equipment', async () => {
  for (const [code, status, kind] of [['42501', 403, 'denied'], ['PGRST205', 404, 'missing'], ['', 503, 'unavailable']]) {
    const mock = backend({ carts: [{ data: null, error: { code }, status, count: null }] });
    await assert.rejects(mock.api.fetchEquipment(selection('carts'), signal()), error => error.kind === kind);
    assert.equal(mock.requests.length, 1);
  }
  const empty = await backend({ carts: [response([])] }).api.fetchEquipment(selection('carts'), signal());
  assert.equal(empty.records.data.rows.length, 0); assert.equal(empty.records.data.count, 0);
  const mock = backend({ carts: [response([{ ...cart(1), current_zone_id: id(9) }])],
    zones: [{ error: { code: '42501' }, data: null }], stores: [response([])] });
  const result = await mock.api.fetchEquipment(selection('carts'), signal());
  assert.equal(result.records.data.rows.length, 1);
  assert.equal(result.records.data.namesUnavailable, true); assert.equal(result.storesUnavailable, true);
  assert.equal(result.records.data.rows[0].current_zone_id, id(9));
});

test('URL retains independent tab filters/pages, resets page on filter change, rejects malformed filters', () => {
  let params = equipmentModel.equipmentParams(new URLSearchParams(), 'carts', { ...equipmentModel.emptyFilters(), search: '001', status: 'online', storeId: id(1) }, 3);
  params = equipmentModel.equipmentParams(params, 'beacons', { ...equipmentModel.emptyFilters(), search: '004', status: 'unknown', withoutZone: true }, 2);
  assert.equal(equipmentModel.readEquipmentSelection(params).page, 2);
  params = equipmentModel.equipmentParams(params, 'carts');
  assert.equal(equipmentModel.readEquipmentSelection(params).page, 3);
  assert.equal(equipmentModel.readEquipmentSelection(params).filters.status, 'online');
  params = equipmentModel.equipmentParams(params, 'carts', equipmentModel.emptyFilters());
  assert.equal(equipmentModel.readEquipmentSelection(params).page, 1);
  assert.equal(equipmentModel.readEquipmentSelection(equipmentModel.equipmentParams(params, 'beacons')).filters.search, '004');
  for (const query of ['tab=zones', 'carts_store=invalid', 'carts_status=legacy', 'carts_page=-1', 'tab=beacons&beacons_without_zone=0', 'carts_page=1&carts_page=2']) {
    assert.equal(equipmentModel.readEquipmentSelection(new URLSearchParams(query)).error, true, query);
  }
  assert.deepEqual(plain(equipmentModel.CART_STATUSES), plain(enums.Constants.public.Enums.cart_status));
});

test('shared tables preserve zero battery, unknown status, string box numbers and optional store column', () => {
  const table = load('src/admin/stores/details/StoreRecordTables.tsx', {
    'react-router': { Link: ({ to, children }) => createElement('a', { href: to }, children) },
    '../../../design-system': { Badge: ({ children }) => createElement('span', null, children) },
    '../../../i18n/i18n': { useI18n: () => ({ lang: 'ru', t: key => key === 'adminStoreDetail.noData' ? 'Нет данных' : key }) },
    '../../../lib/format': { formatNumber: String }, '../../overview/model': { overviewDate: (_date, _lang, fallback) => fallback },
    '../model': storeModel, '../../campaigns/details/CampaignDetail.module.css': {}, './StoreDetail.module.css': {},
  });
  const rows = [{ ...cart(1), cart_number: null, display_id: 42, status: 'offline', zoneName: null }, { ...cart(2), battery_level: null, status: 'unknown', zoneName: null }];
  const card = renderToStaticMarkup(createElement(table.CartTable, { rows }));
  assert.match(card, />0%</); assert.match(card, />Нет данных</); assert.match(card, />42</); assert.match(card, />unknown</);
  assert.doesNotMatch(card, /href=|adminEquipment.store/);
  const global = renderToStaticMarkup(createElement(table.BeaconTable, { rows: [{ ...beacon(1), zoneName: null }], stores: { [id(1)]: 'Store A' } }));
  assert.match(global, />004</); assert.match(global, new RegExp('href="/admin/stores/' + id(1) + '"')); assert.match(global, /Store A/);
});

test('equipment cache keys isolate tab/filter/page and queries stay disabled without session or valid selection', () => {
  let auth = { status: 'ready', session: { user: { id: id(88) } } };
  const hook = load('src/admin/equipment/useEquipment.ts', { '@tanstack/react-query': { useQuery: options => options },
    '../../auth/useAuthSession': { useAuthSession: () => auth }, './api': { fetchEquipment() { throw new Error('Must not run'); } } });
  const first = hook.useEquipment(selection('carts', { storeId: id(1) }));
  const other = hook.useEquipment(selection('carts', { storeId: id(2) }, 2));
  assert.notDeepEqual(plain(first.queryKey), plain(other.queryKey)); assert.equal(first.enabled, true); assert.equal(first.retry, false);
  assert.notDeepEqual(plain(first.queryKey), plain(hook.useEquipment(selection('beacons')).queryKey));
  assert.equal(hook.useEquipment({ ...selection('carts'), error: true }).enabled, false);
  auth = { status: 'ready', session: null };
  assert.equal(hook.useEquipment(selection('carts')).enabled, false);
});
