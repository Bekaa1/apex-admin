import type { ReportConfig } from './data.ts';
import { object, ReportError, type ReportSnapshot } from './model.ts';
import { reportText, number } from './text.ts';

export interface Fact { id: string; label: string; value: number; unit: 'plays' | 'KZT' | 'KZT_per_play'; period: 'current' | 'previous'; formatted: string }
export interface Analysis { summary: string; summaryEvidence: string[]; recommendations: { observation: string; action: string; check: string; evidenceIds: string[] }[] }
export interface Insight { id: string; observation: string; evidenceIds: string[] }
export function reportFacts(snapshot: ReportSnapshot): Fact[] {
  const { language } = snapshot.filters, t = reportText[language];
  const facts: Fact[] = [];
  const add = (prefix: string, label: string, row: ReportSnapshot['totals']) => {
    for (const metric of ['plays', 'previousPlays', 'spent', 'price'] as const) {
      const value = row[metric]; if (value === null) continue;
      const metricLabel = metric === 'previousPlays' ? t.previous : metric === 'spent' && snapshot.estimatedSpend ? t.estimated : t[metric];
      facts.push({ id: `${prefix}.${metric}`, label: `${label} · ${metricLabel}`, value,
        unit: metric === 'spent' ? 'KZT' : metric === 'price' ? 'KZT_per_play' : 'plays', period: metric === 'previousPlays' ? 'previous' : 'current',
        formatted: number(value, language, metric === 'spent' || metric === 'price') });
    }
  };
  add('total', t.total, snapshot.totals);
  for (const row of snapshot.campaigns) add(row.ref, row.ref, row);
  return facts;
}
/** The model selects relevant observations; their wording and numbers are always server-derived. */
export function reportInsights(snapshot: ReportSnapshot): Insight[] {
  const facts = reportFacts(snapshot), index = new Map(facts.map(fact => [fact.id, fact]));
  const describe = (id: string, evidenceIds: string[]): Insight => ({ id, evidenceIds,
    observation: evidenceIds.map(key => { const fact = index.get(key)!; return `${fact.label}: ${fact.formatted}`; }).join('; ') + '.' });
  const overview = ['total.plays', 'total.previousPlays', 'total.spent', 'total.price'].filter(id => index.has(id));
  const insights = [describe('overview', overview)];
  for (const row of snapshot.campaigns) {
    insights.push(describe(`${row.ref}.delivery`, [`${row.ref}.plays`, `${row.ref}.previousPlays`].filter(id => index.has(id))));
  }
  const priced = snapshot.campaigns.filter(row => row.price !== null && row.plays > 0).sort((a, b) => a.price! - b.price!);
  if (priced.length > 1 && priced[0].price !== priced.at(-1)!.price) insights.push(describe('price_difference', [`${priced[0].ref}.price`, `${priced.at(-1)!.ref}.price`]));
  return insights;
}
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length >= 8 && v.length <= max
  && !Array.from(v).some(char => char.charCodeAt(0) < 32 && char !== '\n' && char !== '\t' || char.charCodeAt(0) === 127)
  // Numerical evidence is rendered from server facts, never from model prose.
  && !/\p{N}/u.test(v.replace(/\bC\d+\b/g, ''));
export function parseAnalysis(value: unknown, insights: Insight[]): Analysis {
  const index = new Map(insights.map(insight => [insight.id, insight]));
  const refs = (v: unknown): v is string[] => Array.isArray(v) && v.length >= 1 && v.length <= 3 && v.every(id => typeof id === 'string' && index.has(id)) && new Set(v).size === v.length;
  if (!object(value) || Object.keys(value).some(key => !['summaryInsightIds', 'recommendations'].includes(key)) || !refs(value.summaryInsightIds)
    || !Array.isArray(value.recommendations) || value.recommendations.length < 1 || value.recommendations.length > 6
    || !value.recommendations.every(row => object(row) && Object.keys(row).every(key => ['insightId', 'action', 'check'].includes(key))
      && typeof row.insightId === 'string' && index.has(row.insightId) && text(row.action, 800) && text(row.check, 600))
    || new Set(value.recommendations.map(row => row.insightId)).size !== value.recommendations.length) throw new ReportError('analysis_unavailable');
  const summary = value.summaryInsightIds.map(id => index.get(id)!);
  return { summary: summary.map(insight => insight.observation).join('\n'), summaryEvidence: [...new Set(summary.flatMap(insight => insight.evidenceIds))],
    recommendations: value.recommendations.map(row => ({ observation: index.get(row.insightId)!.observation,
      action: row.action as string, check: row.check as string, evidenceIds: index.get(row.insightId)!.evidenceIds })) };
}
export async function analyze(config: ReportConfig, snapshot: ReportSnapshot, signal: AbortSignal, transport: typeof fetch = fetch): Promise<Analysis> {
  const facts = reportFacts(snapshot);
  const insights = reportInsights(snapshot);
  const prose = (description: string, maxLength: number) => ({ type: 'string', minLength: 8, maxLength,
    pattern: '^(?:[^0-9]|C[0-9]+)*$', description: `${description} Числа и проценты запрещены: основание уже содержит точные значения. Разрешены только ссылки C1, C2 и т.д. Обычный текст на языке ${snapshot.filters.language}.` });
  const insightId = { type: 'string', enum: insights.map(insight => insight.id) };
  const schema = { type: 'object', additionalProperties: false, required: ['summaryInsightIds', 'recommendations'], properties: {
    summaryInsightIds: { type: 'array', minItems: 1, maxItems: 3, items: insightId, description: 'Самые важные подтверждённые наблюдения для краткого итога.' },
    recommendations: { type: 'array', minItems: 1, maxItems: Math.min(6, insights.length), items: {
      type: 'object', additionalProperties: false, required: ['insightId', 'action', 'check'],
      properties: { insightId, action: prose('Конкретное предлагаемое действие для проверки гипотезы в Apex, исходя из выбранного наблюдения. Нет аукциона и ставок. Цена задаётся тарифом.', 800),
        check: prose('Как проверить результат действия на сопоставимых данных. Не констатируй непроверенные факты.', 600) },
    } },
  } };
  let response: Response;
  try {
    response = await transport('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.any([signal, AbortSignal.timeout(50_000)]),
      headers: { Authorization: `Bearer ${config.openRouterKey}`, 'Content-Type': 'application/json', 'X-OpenRouter-Title': 'Apex statistics report' },
      body: JSON.stringify({ model: config.model, temperature: 0.2, max_tokens: 3500, stream: false,
        response_format: { type: 'json_schema', json_schema: { name: 'apex_stats_analysis', strict: true, schema } },
        provider: { require_parameters: true },
        messages: [{ role: 'system', content: `Ты аналитик рекламных показов Apex. Язык ответа: ${snapshot.filters.language}. Верни только JSON по схеме.
Анализируй только переданные факты. Выбери важные insights для итога и рекомендаций. Не повторяй один insightId в рекомендациях. Для каждого выбранного insight предложи конкретное действие и способ проверки результата. Итог и наблюдения сервер подставит из подтверждённых данных, не пиши их заново.
ЧИСЛА ЗАПРЕЩЕНЫ в action и check (кроме ссылок C1, C2 и т.д.). Сервер сам вставит точные числа в «Основание». Не вычисляй и не печатай проценты. Не используй нумерацию.
Не выдумывай рост продаж, конверсии, ROI, уникальный охват, причины изменений, часы или площадки. Не делай вывод об эффективности креатива по числу показов.
КОНТЕКСТ APEX: реклама на Smart тележках в супермаркетах. Цена показа определяется тарифом и может отличаться между кампаниями. Нет аукциона, ставок, CPC, CTR или пользовательского управления ставками. Не предлагай менять ставки, таргетинг аудитории, расписание или настройки, наличие которых не подтверждено. Можно предложить проверить статус кампании, её выбранные площадки, согласованные даты, ограничения показов и доступность бюджета в карточке, проверить ролик экспериментом без утверждения его качества, либо собрать сопоставимые данные. Не утверждай, что эти проверки уже выявили причину.
Показы не равны покупателям. Снижение показов само по себе не доказывает плохую рекламу. Не обещай результат и не советуй автоматически увеличивать бюджет.
Нет разбивки по часам, зонам, супермаркетам, нет продаж и конверсий. Онлайн оборудования не анализируется. При нехватке данных прямо укажи ограничение; не заполняй ответ универсальными советами.
Расход за отдельный период оценён по текущей цене, не является точным списанием; при упоминании называй его расчётным. Расхода за предыдущий период НЕТ; previousPlays — число показов, не деньги. Не сравнивай расходы разных периодов. Ноль предыдущих показов НЕ означает, что кампания новая. Дата запуска дана отдельно в startDate. Текущий день может быть неполным.
Названия кампаний скрыты: ссылки C1 и далее обозначают строки отчёта. Не выдумывай названия. Формулируй рекомендации как гипотезы для проверки.
От одного до шести обоснованных рекомендаций. Только обычный текст, без HTML и Markdown.` },
        { role: 'user', content: JSON.stringify({ range: snapshot.range, compare: snapshot.compare, estimatedSpend: snapshot.estimatedSpend,
          campaigns: snapshot.campaigns.map(row => ({ ref: row.ref, status: row.status, startDate: row.startDate })), facts, insights }) }],
      }),
    });
  } catch { throw new ReportError('analysis_unavailable'); }
  if (!response.ok) throw new ReportError(response.status === 429 ? 'rate_limited' : 'analysis_unavailable', response.status === 429 ? 429 : 503);
  const data: unknown = await response.json().catch(() => null);
  if (!object(data) || data.error || !Array.isArray(data.choices) || !object(data.choices[0]) || !object(data.choices[0].message)) throw new ReportError('analysis_unavailable');
  const content = data.choices[0].message.content;
  if (typeof content !== 'string' || content.length > 24_000 || data.choices[0].finish_reason !== 'stop') throw new ReportError('analysis_unavailable');
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new ReportError('analysis_unavailable'); }
  return parseAnalysis(parsed, insights);
}
