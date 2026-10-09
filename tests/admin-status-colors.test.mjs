import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
function load(file, modules = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: name => { if (name in modules) return modules[name]; throw new Error('Unexpected dependency: ' + name); } });
  return exports;
}
const colors = load('src/admin/statusTone.ts');
const tone = colors.adminStatusTone;
const constants = load('src/lib/database.types.ts').Constants;

test('all campaign enum values have explicit colors; completion is positive, waiting is neutral/warning', () => {
  assert.deepEqual(Object.keys(colors.ADMIN_STATUS_TONES.campaign).sort(), [...constants.public.Enums.ad_status].sort());
  for (const value of ['active', 'completed']) assert.equal(tone('campaign', value), 'success');
  for (const value of ['rejected', 'budget_ended']) assert.equal(tone('campaign', value), 'danger');
  for (const value of ['draft', 'pending', 'awaiting_payment', 'paused', 'hours_ended', 'archived', 'deleted']) {
    assert.ok(['neutral', 'brand', 'warning'].includes(tone('campaign', value)));
  }
});
test('invoices share paid/unpaid/cancelled/overdue presentation in list and campaign card', () => {
  const model = load('src/admin/invoices/model.ts', { '../statusTone': colors });
  for (const value of ['paid', 'unpaid', 'cancelled', 'overdue', 'failed', 'legacy']) {
    assert.equal(model.invoiceStatus(value).tone, tone('invoice', value));
  }
  assert.equal(tone('invoice', 'paid'), 'success');
  for (const value of ['unpaid', 'cancelled', 'overdue', 'failed']) assert.equal(tone('invoice', value), 'danger');
  assert.match(read('src/admin/campaigns/details/FinanceDetails.tsx'), /adminStatusTone\('invoice', row.status\)/);
});
test('devices distinguish availability from neutral inactivity and maintenance', () => {
  for (const value of constants.public.Enums.cart_status) assert.ok(Object.hasOwn(colors.ADMIN_STATUS_TONES.equipment, value));
  for (const value of ['online', 'active', ' Online ']) assert.equal(tone('equipment', value), 'success');
  for (const value of ['offline', 'failed', 'error', 'blocked', 'unavailable']) assert.equal(tone('equipment', value), 'danger');
  assert.equal(tone('equipment', 'inactive'), 'neutral');
  assert.equal(tone('equipment', 'maintenance'), 'warning');
  assert.match(read('src/admin/stores/details/StoreRecordTables.tsx'), /adminStatusTone\('equipment', value\)/);
  assert.match(read('src/admin/partner/PartnerPage.tsx'), /adminStatusTone\(section === 'equipment'/);
});
test('store request rejection is negative, approval positive, pending and draft not success', () => {
  assert.equal(tone('storeRequest', 'approved'), 'success');
  assert.equal(tone('storeRequest', 'rejected'), 'danger');
  assert.equal(tone('storeRequest', 'inactive'), 'neutral');
  assert.equal(tone('storeRequest', 'pending_owner_approval'), 'warning');
  assert.equal(colors.adminStatusAlertTone('storeRequest', 'approved'), 'success');
  assert.equal(colors.adminStatusAlertTone('storeRequest', 'rejected'), 'danger');
  assert.equal(colors.adminStatusAlertTone('storeRequest', 'pending_owner_approval'), 'warning');
  assert.equal(colors.adminStatusAlertTone('storeRequest', 'unknown'), 'info');
  assert.match(read('src/admin/stores/owner/OwnerDecision.tsx'), /adminStatusAlertTone\('storeRequest', notice.outcome\)/);
});
test('tariff purchase availability is independent from archive state', () => {
  assert.equal(tone('availability', 'available'), 'success');
  assert.equal(tone('availability', 'unavailable'), 'danger');
  assert.match(read('src/admin/tariffs/TariffTable.tsx'), /tone="neutral">\{t\(row.is_archived/);
});
test('unknown, missing and prototype names cannot pick a positive or negative tone', () => {
  for (const domain of Object.keys(colors.ADMIN_STATUS_TONES)) {
    for (const value of [null, undefined, '', '  ', 'future_status', 'constructor', '__proto__', 'toString']) assert.equal(tone(domain, value), 'neutral');
  }
  const row = { status: 'active', status_color: '#FF0000' };
  assert.equal(tone('campaign', row.status), 'success');
  assert.doesNotMatch(read('src/admin/campaigns/api.ts'), /select\([^)]*status_color/);
  assert.doesNotMatch(read('src/admin/campaigns/details/api.ts'), /select\([^)]*status_color/);
});
test('dashboard counts distinguish states; zero/error/missing counts never fake positive results', () => {
  assert.equal(colors.adminCounterTone('active', 5), 'success');
  assert.equal(colors.adminCounterTone('unpaid', 5), 'danger');
  assert.equal(colors.adminCounterTone('awaiting_payment', 5), 'warning');
  for (const count of [0, null, undefined, NaN]) assert.equal(colors.adminCounterTone('unpaid', count), 'neutral');
  assert.equal(colors.adminCounterTone('active', 5, true), 'danger');
});
test('existing delta helper honors benefit direction; zero is neutral and arrows track actual movement', () => {
  const chart = load('src/cabinet/charts.ts', { '../lib/format': {} });
  assert.equal(chart.deltaTone(.12), 'success'); assert.equal(chart.deltaTone(-.08), 'danger');
  assert.equal(chart.deltaTone(0), 'neutral'); assert.equal(chart.deltaTone(.001), 'neutral');
  assert.equal(chart.deltaTone(.12, true), 'danger'); assert.equal(chart.deltaTone(-.08, true), 'success');
  assert.equal(chart.deltaTrend(-.08), 'down'); assert.equal(chart.deltaTrend(.12), 'up');
});

const luminance = hex => {
  const channels = hex.match(/[\da-f]{2}/gi).map(c => parseInt(c, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
};
test('existing semantic tokens meet 4.5:1 for badge/alert/checklist text in both themes', () => {
  const css = read('src/design-system/tokens.css');
  const blocks = [css.split('[data-theme="dark"]')[0], css.split('[data-theme="dark"]')[1]];
  for (const block of blocks) {
    const vars = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(m => [m[1], m[2]]));
    for (const semantic of ['success', 'danger', 'warning']) {
      for (const background of [semantic + '-soft', 'surface', 'bg']) {
        const a = luminance(vars[semantic]), b = luminance(vars[background]);
        const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
        assert.ok(ratio >= 4.5, `${semantic}/${background}: ${ratio.toFixed(2)}`);
      }
    }
  }
});
