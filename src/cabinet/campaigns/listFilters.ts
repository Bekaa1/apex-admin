import type { Lang } from '../../i18n/i18n';
import { tabOf } from './model';
import type { CampaignCard, CampaignSort, CampaignTab, PlaysPeriod } from './types';

export interface ListFilters {
  tab: CampaignTab;
  query: string;
  period: PlaysPeriod;
  sort: CampaignSort;
}

export const TABS: CampaignTab[] = ['all', 'running', 'review', 'finished'];
export const PERIODS: PlaysPeriod[] = ['week', 'month', 'all'];
export const SORTS: CampaignSort[] = ['new', 'budgetLeft', 'shows', 'name'];
const DEFAULTS: ListFilters = { tab: 'all', query: '', period: 'week', sort: 'new' };

function pick<V extends string>(value: string | null, options: V[], fallback: V): V {
  return options.find((option) => option === value) ?? fallback;
}

/** Filters live in the URL (?tab=&q=&period=&sort=) so reloads and links keep them; unknown values fall back to defaults. */
export function parseFilters(params: URLSearchParams): ListFilters {
  return {
    tab: pick(params.get('tab'), TABS, DEFAULTS.tab),
    query: params.get('q') ?? DEFAULTS.query,
    period: pick(params.get('period'), PERIODS, DEFAULTS.period),
    sort: pick(params.get('sort'), SORTS, DEFAULTS.sort),
  };
}

/** Writes filters over the current params (keeps ?demo= and the rest), leaving defaults out. */
export function writeFilters(params: URLSearchParams, filters: ListFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  const entries: Array<[string, string, string]> = [
    ['tab', filters.tab, DEFAULTS.tab],
    ['q', filters.query.trim(), DEFAULTS.query],
    ['period', filters.period, DEFAULTS.period],
    ['sort', filters.sort, DEFAULTS.sort],
  ];
  for (const [key, value, fallback] of entries) {
    if (value === fallback) next.delete(key);
    else next.set(key, value);
  }
  return next;
}

export function countByTab(cards: CampaignCard[]): Record<CampaignTab, number> {
  const counts: Record<CampaignTab, number> = { all: cards.length, running: 0, review: 0, finished: 0 };
  for (const card of cards) counts[tabOf(card)] += 1;
  return counts;
}

function compare(sort: CampaignSort, period: PlaysPeriod, lang: Lang) {
  const newest = (a: CampaignCard, b: CampaignCard) => b.createdAt.localeCompare(a.createdAt);
  switch (sort) {
    case 'new':
      return newest;
    // Least money left first: those campaigns need a top-up soonest. Finished campaigns and ones without a budget go last.
    case 'budgetLeft': {
      const last = (card: CampaignCard) => Number(card.budget.budget === 0 || card.stage.kind === 'finished');
      return (a: CampaignCard, b: CampaignCard) => last(a) - last(b) || a.budget.left - b.budget.left || newest(a, b);
    }
    case 'shows':
      return (a: CampaignCard, b: CampaignCard) => (b.plays?.[period] ?? -1) - (a.plays?.[period] ?? -1) || newest(a, b);
    case 'name':
      return (a: CampaignCard, b: CampaignCard) => a.name.localeCompare(b.name, lang);
  }
}

export function visibleCards(cards: CampaignCard[], filters: ListFilters, lang: Lang): CampaignCard[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return cards
    .filter((card) => filters.tab === 'all' || tabOf(card) === filters.tab)
    .filter((card) => !query || card.name.toLocaleLowerCase().includes(query))
    .sort(compare(filters.sort, filters.period, lang));
}

export function totalPlaysFor(cards: CampaignCard[], period: PlaysPeriod): number {
  return cards.reduce((sum, card) => sum + (card.plays?.[period] ?? 0), 0);
}
