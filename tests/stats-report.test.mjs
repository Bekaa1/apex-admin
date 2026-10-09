import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { readReportConfig, userClient, authorize, readSnapshot } from '../server/stats/data.ts';
import { buildSnapshot, parseFilters, parseCampaigns, parsePlays } from '../server/stats/model.ts';
import { analyze, parseAnalysis, reportInsights } from '../server/stats/analysis.ts';
import { renderReport } from '../server/stats/pdf.ts';
import { StatsReports } from '../server/stats/service.ts';
import { handleStatsReport } from '../server/stats/handler.ts';
import { fetchReport, ReportDownloadTask } from '../src/cabinet/stats/reportDownload.ts';
import { statsDateRanges, launchedForStats } from '../src/cabinet/stats/reportSelection.ts';
import { filters, config, analysis, analysisReply, campaign, fixture, uuid } from './helpers/statsReport.mjs';

const signal = () => AbortSignal.timeout(10_000);
const issue = code => error => error.code === code || error.issue === code;

test('server configuration requires public Apex key and server OpenRouter key', () => {
  const env = { APEX_PUBLIC_SUPABASE_URL: 'https://apex.supabase.co', APEX_PUBLIC_SUPABASE_KEY: 'sb_publishable_fake', OPENROUTER_API_KEY: 'sk-or-test' };
  assert.ok(readReportConfig(env));
  assert.equal(readReportConfig({ ...env, OPENROUTER_API_KEY: '' }), null);
  assert.equal(readReportConfig({ ...env, APEX_PUBLIC_SUPABASE_KEY: 'sb_secret_forbidden' }), null);
  assert.equal(readReportConfig({ ...env, CHAT_SUPABASE_URL: env.APEX_PUBLIC_SUPABASE_URL }), null);
});
test('only filters accepted; forged user/metrics cannot be sent', () => {
  assert.deepEqual(parseFilters(filters), filters);
  for (const bad of [{ ...filters, userId: uuid(1) }, { ...filters, spent: 5 }, { ...filters, period: 'year' }, { ...filters, campaignId: 'invalid' }, { ...filters, language: 'other' },
    { ...filters, period: ['7d'] }, { ...filters, scope: ['all'] }, { ...filters, language: ['ru'] }])
    assert.throws(() => parseFilters(bad), issue('invalid_request'));
});
test('shared selection preserves Almaty period, comparison and lifetime semantics', () => {
  assert.deepEqual(statsDateRanges([], [], '7d', '2026-10-09'), { range: { from: '2026-10-03', to: '2026-10-09' }, compare: { from: '2026-09-26', to: '2026-10-02' } });
  assert.deepEqual(statsDateRanges([campaign(1, { status: 'completed', start_date: '2026-09-30T22:00:00Z', end_date: '2026-10-05T00:00:00Z' })], [], 'all', '2026-10-09').range, { from: '2026-10-01', to: '2026-10-05' });
  assert.equal(launchedForStats(campaign(1, { status: 'pending', start_date: null })), false);
  assert.equal(launchedForStats(campaign(1, { status: 'pending' })), true);
});
test('snapshot uses selected campaigns and estimates spend, preserving unknown costs', () => {
  const { campaigns, plays, now } = fixture();
  const snapshot = buildSnapshot(campaigns, plays, filters, now);
  assert.equal(snapshot.totals.plays, 200); assert.equal(snapshot.totals.spent, 70); assert.equal(snapshot.totals.price, 0.35);
  assert.equal(snapshot.totals.previousPlays, 40); assert.equal(snapshot.estimatedSpend, true);
  const single = buildSnapshot(campaigns, plays, { ...filters, campaignId: uuid(2) }, now);
  assert.equal(single.campaigns.length, 1); assert.equal(single.totals.plays, 80);
  const unknown = buildSnapshot([campaign(1, { price_per_play: null })], plays, filters, now);
  assert.equal(unknown.totals.spent, null); assert.equal(unknown.totals.price, null);
  assert.equal(buildSnapshot(campaigns, plays, { ...filters, period: 'all' }, now).totals.spent, 10000);
});
test('export totals and boundaries match the actual statistics page for every filter combination', () => {
  const cache = new Map();
  function load(path) {
    const file = path.endsWith('.ts') ? path : `${path}.ts`;
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
    vm.runInNewContext(source, { exports, Intl, Date, Map, Set, require: name => load(resolve(dirname(file), name)) });
    return exports;
  }
  const root = fileURLToPath(new URL('../src/cabinet/stats/', import.meta.url));
  const { selectStats } = load(resolve(root, 'selection.ts'));
  const { buildStatsView } = load(resolve(root, 'model.ts'));
  const now = new Date('2026-10-09T12:00:00Z');
  const f = fixture({ now, campaigns: [campaign(1), campaign(2, { status: 'completed', end_date: '2026-10-08T12:00:00Z' })] });
  const source = { today: '2026-10-09', campaigns: f.campaigns, dailyPlays: f.plays, stores: [], locations: [], storePlays: null, zonePlays: null, cartsNow: null, syncedAt: null };
  for (const period of ['7d', '30d', '90d', 'all']) for (const scope of ['all', 'running', 'finished']) for (const campaignId of [null, uuid(1), uuid(2)]) {
    const selection = { ...filters, period, scope, campaignId, step: null };
    const page = buildStatsView(source, { hours: null, worked: null }, selectStats(source, selection), selection);
    const report = buildSnapshot(f.campaigns, f.plays, { ...filters, period, scope, campaignId }, now);
    assert.equal(page.body.kind, 'report');
    assert.equal(JSON.stringify(report.range), JSON.stringify(page.body.meta.range));
    assert.equal(report.totals.plays, page.body.kpis.plays);
    assert.equal(report.totals.spent, page.body.kpis.spent);
    assert.equal(report.totals.price, page.body.kpis.price);
  }
});
test('data size and malformed pagination never produce a partial report', async () => {
  const f = fixture({ count: 6000 });
  await assert.rejects(readSnapshot(userClient(config, 'user', signal(), f.transport), filters, signal()), issue('too_large'));
  const empty = fixture({ campaigns: [] });
  await assert.rejects(readSnapshot(userClient(config, 'user', signal(), empty.transport), filters, signal()), issue('no_data'));
});
test('no empty report, invalid data or foreign campaign fallback', () => {
  assert.throws(() => buildSnapshot([], [], filters), issue('no_data'));
  assert.throws(() => buildSnapshot([campaign()], [], filters), issue('no_data'));
  assert.throws(() => buildSnapshot([campaign()], [], { ...filters, campaignId: uuid(9) }), issue('campaign_unavailable'));
  assert.throws(() => parseCampaigns([campaign(1, { spent_budget: NaN })]), issue('invalid_data'));
  assert.throws(() => parsePlays([{ ad_id: uuid(1), play_date: '2026-02-30', plays: 1 }]), issue('invalid_data'));
  assert.throws(() => parsePlays([{ ad_id: uuid(1), play_date: '2026-10-01', plays: null }]), issue('invalid_data'));
});
test('RLS reads use caller JWT and only my views; pagination follows real server cap', async () => {
  const f = fixture({ pageCap: 1 }); const client = userClient(config, 'synthetic-user-token', signal(), f.transport);
  assert.equal(await authorize(client, 'synthetic-user-token'), uuid(99));
  const report = await readSnapshot(client, filters, signal(), f.now);
  assert.equal(report.totals.plays, 200);
  assert.ok(f.calls.length >= 6);
  for (const call of f.calls) {
    assert.equal(call.headers.get('Authorization'), 'Bearer synthetic-user-token');
    assert.equal(call.headers.get('apikey'), config.publicKey);
    assert.equal(call.method, 'GET');
  }
});
test('expired auth and RLS refusal cannot reach OpenRouter', async () => {
  for (const options of [{ badAuth: true }, { denied: true }]) {
    const f = fixture(options); const service = new StatsReports(config, f.transport);
    await assert.rejects(service.generate('fake-user', filters, signal()), issue(options.badAuth ? 'not_authenticated' : 'forbidden'));
    assert.ok(!f.calls.some(call => call.url.includes('openrouter.ai')));
  }
});
test('analysis receives only canonical anonymous facts, no credentials or campaign names', async () => {
  const f = fixture(); const snapshot = buildSnapshot(f.campaigns, f.plays, filters, f.now);
  const result = await analyze(config, snapshot, signal(), f.transport);
  assert.equal(result.recommendations[0].action, analysis.recommendations[0].action);
  assert.match(result.summary, /200/);
  assert.match(result.recommendations[0].observation, /120/);
  const call = f.calls[0];
  assert.equal(call.headers.get('Authorization'), `Bearer ${config.openRouterKey}`);
  const payload = JSON.parse(call.body.messages[1].content);
  assert.equal(payload.facts.find(fact => fact.id === 'total.plays').value, 200);
  assert.ok(!JSON.stringify(payload).includes('Синтетическая'));
  assert.ok(!JSON.stringify(payload).includes(uuid(1)));
  assert.equal(call.body.response_format.type, 'json_schema');
});
test('AI failures and invented evidence fail closed', async () => {
  const f = fixture({ aiFailure: true }); const snapshot = buildSnapshot(f.campaigns, f.plays, filters, f.now);
  await assert.rejects(analyze(config, snapshot, signal(), f.transport), issue('analysis_unavailable'));
  assert.throws(() => parseAnalysis({ ...analysisReply, summaryInsightIds: ['made-up'] }, reportInsights(snapshot)), issue('analysis_unavailable'));
  assert.throws(() => parseAnalysis({ ...analysisReply, recommendations: [] }, reportInsights(snapshot)), issue('analysis_unavailable'));
  assert.throws(() => parseAnalysis({ ...analysisReply, summary: 'Рост составил 9999 процентов.' }, reportInsights(snapshot)), issue('analysis_unavailable'));
  assert.throws(() => parseAnalysis({ ...analysisReply, recommendations: [{ ...analysisReply.recommendations[0], action: 'Увеличить расход на 9999 процентов' }] }, reportInsights(snapshot)), issue('analysis_unavailable'));
});
test('server blocks concurrent clicks per user and applies rate limit', async () => {
  let release; const wait = new Promise(resolve => { release = resolve; });
  const f = fixture({ wait }); const service = new StatsReports(config, f.transport);
  const first = service.generate('user', filters, signal());
  while (!f.calls.some(call => call.url.includes('openrouter.ai'))) await new Promise(resolve => setTimeout(resolve, 5));
  await assert.rejects(service.generate('user', filters, signal()), issue('busy'));
  release(); const result = await first; assert.equal(result.pdf.subarray(0, 5).toString(), '%PDF-');
  await service.generate('user', filters, signal()); await service.generate('user', filters, signal());
  await assert.rejects(service.generate('user', filters, signal()), issue('rate_limited'));
});
test('PDF renders Cyrillic and long names for all languages without remote assets', async () => {
  const f = fixture();
  for (const language of ['ru', 'kk', 'en']) {
    const snapshot = buildSnapshot([campaign(1, { title: 'Ұзын атау / Длинное название '.repeat(15) }), campaign(2)], f.plays, { ...filters, language }, f.now);
    const pdf = await renderReport(snapshot, analysis);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-'); assert.ok(pdf.length > 10_000);
    assert.ok(pdf.toString('latin1').includes('/FontFile2'));
  }
});
test('HTTP -> mocked data -> OpenRouter -> PDF; errors never download JSON', async t => {
  const f = fixture(); const service = new StatsReports(config, f.transport);
  const server = createServer((req, res) => { void handleStatsReport(req, res, service, new Set(['https://apexmedia.kz'])); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const transport = (_input, init) => fetch(url, init);
  const pdf = await fetchReport(filters, 'user', signal(), transport);
  assert.equal(await pdf.slice(0, 5).text(), '%PDF-');
  const denied = await fetch(url, { method: 'POST' }); assert.equal(denied.status, 401);
  const cross = await fetch(url, { method: 'POST', headers: { Origin: 'https://evil.invalid' } }); assert.equal(cross.status, 403);
  await assert.rejects(fetchReport(filters, 'user', signal(), async () => new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } })), issue('report_unavailable'));
  await assert.rejects(fetchReport(filters, 'user', signal(), async () => new Response('{"error":"internal SQL"}', { status: 503 })), issue('report_unavailable'));
});
test('frontend lock suppresses double click and cancellation aborts work', async () => {
  const task = new ReportDownloadTask(); let invoked = 0, firstSignal;
  let release; const first = task.run(async signal => { firstSignal = signal; invoked++; await new Promise(resolve => { release = resolve; }); return true; });
  assert.equal(await task.run(async () => { invoked++; }), undefined); assert.equal(invoked, 1);
  task.cancel(); assert.equal(firstSignal.aborted, true); release(); assert.equal(await first, true);
  assert.equal(await task.run(async () => 7), 7);
});
test('UI translations, safe session ownership and server-only PDF boundary', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const ru = JSON.parse(read('src/i18n/statsExport.ru.json'));
  for (const language of ['kk', 'en']) { const dict = JSON.parse(read(`src/i18n/statsExport.${language}.json`)); assert.deepEqual(Object.keys(dict), Object.keys(ru)); assert.deepEqual(Object.keys(dict.errors), Object.keys(ru.errors)); }
  const component = read('src/cabinet/stats/StatsExport.tsx');
  assert.match(component, /data.session\?\.user.id !== userId/);
  assert.match(component, /current.cancel\(\)/); assert.match(component, /!enabled \|\| demo/);
  assert.ok(!component.includes('OPENROUTER_API_KEY')); assert.ok(!component.includes('pdfkit'));
  assert.match(read('server/stats/data.ts'), /\.retry\(false\)/);
  assert.match(read('vite.config.ts'), /\/api\/stats\/report/);
});
