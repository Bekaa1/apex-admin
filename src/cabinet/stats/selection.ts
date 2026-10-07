// Which campaigns and dates the page counts, from the filters in the URL.
import { todayInAlmaty } from '../../lib/dates';
import { budgetFigures, type BudgetFigures } from '../campaignBudget';
import { coverTone, type CoverTone } from '../campaignCover';
import { LAUNCHED_STAGES, stageOf, type CampaignStage } from '../campaignStage';
import type { ChartStep } from '../charts';
import { tariffOf, type TariffCode } from '../tariffs';
import { defaultStep, periodRanges } from './period';
import type { DateRange, StatsCampaignRow, StatsFilters, StatsOption, StatsPeriod, StatsSource } from './types';

/** A campaign that has already been on the screens. */
export interface Chosen {
  id: string;
  row: StatsCampaignRow;
  name: string;
  stage: CampaignStage;
  money: BudgetFigures;
  coverTone: CoverTone;
  tariff: TariffCode | 'corporate' | null;
}

export interface StatsSelection {
  options: StatsOption[];
  /** Campaigns waiting for moderation or payment, for the empty state. */
  waiting: number;
  hasLaunched: boolean;
  single: Chosen | null;
  chosen: Chosen[];
  ids: ReadonlySet<string>;
  period: StatsPeriod;
  range: DateRange;
  compare: DateRange | null;
  /** `range` from the first start of the chosen campaigns: the chart and the averages begin there. */
  chartRange: DateRange;
  step: ChartStep;
}

// Campaign timestamps are counted in Almaty days, like the plays.
const almatyDay = (timestamp: string) => todayInAlmaty(new Date(timestamp));
const earliest = (days: string[]) => days.reduce<string | null>((min, day) => (min === null || day < min ? day : min), null);
const latest = (days: string[]) => days.reduce<string | null>((max, day) => (max === null || day > max ? day : max), null);

/** «Всё время»: from the first start or play to today, or to the last day of campaigns that are all over. */
function lifetimeOf(chosen: Chosen[], source: StatsSource, ids: ReadonlySet<string>): DateRange {
  const playDays = source.dailyPlays.flatMap((row) => (row.ad_id && row.play_date && (row.plays ?? 0) > 0 && ids.has(row.ad_id) ? [row.play_date] : []));
  const starts = chosen.flatMap((c) => (c.row.start_date ? [almatyDay(c.row.start_date)] : []));
  const from = earliest([...starts, ...playDays]) ?? source.today;
  const over = chosen.length > 0 && chosen.every((c) => c.stage.kind === 'finished');
  const ends = chosen.flatMap((c) => (c.row.end_date ? [almatyDay(c.row.end_date)] : []));
  const to = over ? (latest([...ends, ...playDays]) ?? source.today) : source.today;
  return { from, to: to < source.today ? to : source.today };
}

export function selectStats(source: StatsSource, filters: StatsFilters): StatsSelection {
  const campaigns = source.campaigns.flatMap((row): Chosen[] => {
    if (!row.ad_id) return [];
    const money = budgetFigures(row);
    const stage = stageOf(row, money);
    if (!stage) return [];
    return [{ id: row.ad_id, row, name: row.title || row.name || '—', stage, money, coverTone: coverTone(row.ad_id), tariff: tariffOf(row.tariff_code) }];
  });
  const launched = campaigns
    .filter((c) => LAUNCHED_STAGES.includes(c.stage.kind))
    .sort((a, b) => (b.row.start_date ?? '').localeCompare(a.row.start_date ?? ''));
  const single = launched.find((c) => c.id === filters.campaignId) ?? null;
  const chosen = single ? [single] : launched.filter((c) => filters.scope === 'all' || (c.stage.kind === 'finished') === (filters.scope === 'finished'));
  const ids = new Set(chosen.map((c) => c.id));

  const period = filters.period ?? (single?.stage.kind === 'finished' ? 'all' : '30d');
  const { range, compare } = periodRanges(period, source.today, lifetimeOf(chosen, source, ids));
  const start = earliest(chosen.flatMap((c) => (c.row.start_date ? [almatyDay(c.row.start_date)] : [])));
  const chartFrom = start && start > range.from && start <= range.to ? start : range.from;
  const chartRange = { from: chartFrom, to: range.to };

  return {
    options: launched.map((c) => ({ id: c.id, name: c.name })),
    waiting: campaigns.filter((c) => c.stage.kind === 'review' || c.stage.kind === 'awaitingPayment').length,
    hasLaunched: launched.length > 0,
    single,
    chosen,
    ids,
    period,
    range,
    compare,
    chartRange,
    step: filters.step ?? defaultStep(chartRange),
  };
}
