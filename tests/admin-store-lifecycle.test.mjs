import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { storeBackend } from './helpers/store-backend.mjs';

function fixture() {
  const backend = storeBackend(), cache = new Map();
  function load(file) {
    const absolute = path.resolve(file);
    if (absolute.endsWith(path.normalize('src/lib/supabase.ts'))) return { requireSupabase: () => backend.client };
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    const source = fs.readFileSync(absolute, 'utf8');
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
      { exports, AbortSignal, TextEncoder, URLSearchParams, console: { error() {} }, require: name => {
        assert.ok(name.startsWith('.'), 'No external dependencies or network allowed');
        return load(path.resolve(path.dirname(absolute), name + '.ts'));
      } }, { filename: absolute });
    return exports;
  }
  const base = 'src/admin/stores/onboarding/';
  const modules = Object.fromEntries(['api','model','save','attempt','plan/model','plan/save','zoning/model','zoning/save','review/model','review/submit'].map(n => [n, load(base + n + '.ts')]));
  return { backend, m: modules, decisions: load('src/admin/stores/owner/decide.ts'), lists: load('src/admin/stores/requests/api.ts') };
}
const fields = { name: 'Local store', city: 'Local city', address: 'Local address', timezone: 'Asia/Almaty' };
const requestKey = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const plain = v => JSON.parse(JSON.stringify(v));
async function draft(f, lost = false) {
  const memory = new Map();
  const attempts = f.m.attempt.createAttemptStore('local', { getItem: k => memory.get(k), setItem: (k,v) => memory.set(k,v), removeItem: k => memory.delete(k) }, () => requestKey);
  if (lost) {
    f.backend.loseNext('admin_create_store_request');
    await assert.rejects(f.m.save.saveDetails(null, fields, attempts));
  }
  const result = await f.m.save.saveDetails(null, fields, attempts);
  attempts.acknowledge(result.record.id);
  return f.m.api.getRequest(result.record.id);
}
async function prepare(f, record, lost = false) {
  if (lost) f.backend.loseNext('admin_save_store_plan');
  const plan = await f.m['plan/save'].savePlan(record, { data: f.m['plan/model'].EXAMPLE_PLAN, name: 'local.json' });
  assert.equal(plan.outcome, 'saved');
  const restored = f.m['zoning/model'].restoreZoning(await f.m.api.getRequest(record.id));
  const zoning = { zones: [{ client_id: 'zone-local', name: 'Local zone', color: '#22aa55', description: '', sort_order: 0 }], assignments: new Map([['A-1','zone-local']]) };
  assert.equal(restored.plan.elements.length, 3);
  if (lost) f.backend.loseNext('admin_replace_store_zoning');
  const saved = await f.m['zoning/save'].saveZoning(plan.record, zoning, () => {});
  assert.equal(saved.outcome, 'saved');
  assert.equal(f.m['review/model'].reviewRequest(saved.record).valid, true);
  assert.equal(f.m['review/model'].reviewRequest(saved.record).unassigned, 2);
  return saved.record;
}

test('complete lifecycle: create/reopen/plan/zones/submit/reject/edit/resubmit/approve, using real frontend adapters', async () => {
  const f = fixture(); let r = await prepare(f, await draft(f));
  assert.equal(r.revision, 3);
  let result = await f.m['review/submit'].submitReviewed(r, revision => assert.equal(revision, 4)); r = result.record;
  assert.equal(r.status, 'pending_owner_approval');
  f.backend.setRole('owner');
  result = await f.decisions.decideRequest(true, r, 'reject', '  Correct the address  ', () => {}); r = result.record;
  assert.equal(r.status, 'rejected'); assert.equal(r.review_comment, 'Correct the address');
  f.backend.setRole('admin');
  r = (await f.m.save.saveDetails(r, { ...fields, address: 'Corrected address' })).record;
  assert.equal(r.revision, 6);
  r = (await f.m['review/submit'].submitReviewed(r, () => {})).record;
  f.backend.setRole('owner'); let published;
  r = (await f.decisions.decideRequest(true, r, 'approve', '', result => { published = result.storeId; })).record;
  assert.equal(r.status, 'approved'); assert.equal(r.published_store_id, published); assert.equal(r.revision, 8);
  const queue = await f.backend.client.rpc('owner_list_pending_store_requests').abortSignal(); assert.equal(queue.data.length, 0);
  assert.equal(f.backend.records.size, 1);
  for (const call of f.backend.calls) assert.equal(call.args.p_partner_id, undefined);
});

test('lost replies across every mutation reconcile using reads; create retries reuse a key and never duplicate', async () => {
  const f = fixture(); let r = await draft(f, true);
  assert.equal(f.backend.records.size, 1);
  f.backend.loseNext('admin_update_store_request');
  r = (await f.m.save.saveDetails(r, { ...fields, city: 'Changed city' })).record;
  r = await prepare(f, r, true);
  f.backend.loseNext('admin_submit_store_request');
  r = (await f.m['review/submit'].submitReviewed(r, () => {})).record;
  f.backend.setRole('owner'); f.backend.loseNext('owner_reject_store_request');
  r = (await f.decisions.decideRequest(true, r, 'reject', 'Local correction', () => {})).record;
  f.backend.setRole('admin'); r = (await f.m['review/submit'].submitReviewed(r, () => {})).record;
  f.backend.setRole('owner'); f.backend.loseNext('owner_approve_store_request');
  r = (await f.decisions.decideRequest(true, r, 'approve', '', () => {})).record;
  assert.equal(r.status, 'approved');
  for (const name of ['admin_update_store_request','admin_save_store_plan','admin_replace_store_zoning','owner_reject_store_request','owner_approve_store_request']) assert.equal(f.backend.calls.filter(c => c.name === name).length, 1);
  assert.equal(f.backend.calls.filter(c => c.name === 'admin_create_store_request').length, 2);
});

test('stale tabs reload without retry; owner status changed elsewhere removes permission to decide', async () => {
  const f = fixture(); const first = await draft(f), second = await f.m.api.getRequest(first.id);
  await f.m.save.saveDetails(first, { ...fields, city: 'Tab one' });
  const stale = await f.m.save.saveDetails(second, { ...fields, city: 'Tab two' });
  assert.equal(stale.outcome, 'changed'); assert.equal(stale.record.city, 'Tab one');
  let r = await prepare(f, stale.record); r = (await f.m['review/submit'].submitReviewed(r, () => {})).record;
  f.backend.setRole('owner'); await f.decisions.decideRequest(true, r, 'reject', 'Another decision', () => {});
  const changed = await f.decisions.decideRequest(true, r, 'approve', '', () => {});
  assert.equal(changed.outcome, 'changed'); assert.equal(changed.record.status, 'rejected');
  assert.equal(f.backend.calls.filter(c => c.name === 'owner_approve_store_request').length, 1);
});

test('denied and foreign records cannot mutate through frontend controllers', async () => {
  const f = fixture(); const r = await prepare(f, await draft(f));
  const before = f.backend.calls.length;
  await assert.rejects(f.m.save.saveDetails({ ...r, is_mine: false }, fields));
  await assert.rejects(f.m['review/submit'].submitReviewed({ ...r, is_mine: false }, () => {}));
  await assert.rejects(f.decisions.decideRequest(false, { ...r, status: 'pending_owner_approval' }, 'approve', '', () => {}));
  assert.equal(f.backend.calls.length, before);
  assert.deepEqual(plain(f.m['zoning/model'].restoreZoning(r).draft.assignments.get('A-1')), 'zone-local');
});
