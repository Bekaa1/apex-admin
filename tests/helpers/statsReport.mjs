import { todayInAlmaty, shiftDate } from '../../src/lib/dates.ts';

export const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const filters = { campaignId: null, period: '7d', scope: 'all', language: 'ru' };
export const campaign = (n = 1, values = {}) => ({ ad_id: uuid(n), title: `Синтетическая кампания ${n}`, name: null, status: 'active',
  start_date: '2026-01-01T10:00:00Z', end_date: null, spent_budget: 5000, price_per_play: 0.25, ...values });
export const analysis = { summary: 'Количество показов различается между кампаниями; сравнение приведено в показателях отчёта.', summaryEvidence: ['total.plays'],
  recommendations: [{ observation: 'Показы сосредоточены в выбранной кампании.', action: 'Проверьте распределение бюджета и статус размещения этой кампании перед изменением настроек.',
    check: 'Сравните показы за следующий сопоставимый период, учитывая неполный текущий день.', evidenceIds: ['C1.plays', 'C1.spent'] }] };
export const config = { url: 'https://apex-report.invalid', publicKey: 'sb_publishable_synthetic', openRouterKey: 'sk-or-synthetic', model: 'synthetic-model' };
export const analysisReply = { summaryInsightIds: ['overview'], recommendations: [{ insightId: 'C1.delivery', action: analysis.recommendations[0].action, check: analysis.recommendations[0].check }] };
export function fixture(options = {}) {
  const calls = [];
  const now = options.now ?? new Date();
  const day = todayInAlmaty(now);
  const campaigns = options.campaigns ?? [campaign(1), campaign(2, { price_per_play: 0.5 })];
  const plays = options.plays ?? [{ ad_id: uuid(1), play_date: day, plays: 120 }, { ad_id: uuid(2), play_date: day, plays: 80 }, { ad_id: uuid(1), play_date: shiftDate(day, -8), plays: 40 }];
  const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  const transport = async (input, init = {}) => {
    const url = new URL(String(input)); const headers = new Headers(init.headers);
    calls.push({ url: url.href, method: init.method ?? 'GET', headers, body: init.body ? JSON.parse(init.body) : null });
    if (url.origin === 'https://openrouter.ai') {
      if (options.wait) await options.wait;
      if (options.aiFailure) return json({ error: 'synthetic' }, 503);
      return json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(options.analysis ?? analysisReply) } }] });
    }
    if (url.origin !== config.url) throw new Error('Unexpected network destination in test');
    if (url.pathname === '/auth/v1/user') return options.badAuth ? json({ message: 'bad token' }, 401) : json({ id: uuid(99), is_anonymous: false });
    if (url.pathname.startsWith('/rest/v1/')) {
      if (options.denied) return json({ code: '42501', message: 'Internal SQL deliberately hidden' }, 403);
      let rows = url.pathname.endsWith('/my_campaigns_stats') ? campaigns : plays;
      const id = url.searchParams.get('ad_id');
      if (id?.startsWith('eq.')) rows = rows.filter(row => row.ad_id === id.slice(3));
      if (id?.startsWith('in.')) rows = rows.filter(row => id.includes(row.ad_id));
      for (const filter of url.searchParams.getAll('play_date')) {
        if (filter.startsWith('gte.')) rows = rows.filter(row => row.play_date >= filter.slice(4));
        if (filter.startsWith('lte.')) rows = rows.filter(row => row.play_date <= filter.slice(4));
      }
      const offset = Number(url.searchParams.get('offset') ?? 0), limit = options.pageCap ?? Number(url.searchParams.get('limit') ?? 500);
      const page = rows.slice(offset, offset + limit);
      return json(page, 200, { 'content-range': `${offset}-${offset + page.length - 1}/${options.count ?? rows.length}` });
    }
    throw new Error('Unexpected request');
  };
  return { transport, calls, campaigns, plays, now };
}
