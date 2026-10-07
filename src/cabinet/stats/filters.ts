import type { ChartStep } from '../charts';
import { STATS_PERIODS } from './period';
import type { StatsFilters, StatsScope } from './types';

export const STATS_SCOPES: StatsScope[] = ['all', 'running', 'finished'];
export const CHART_STEPS: ChartStep[] = ['day', 'week', 'month'];

const pick = <V extends string>(values: readonly V[], raw: string | null): V | null => values.find((value) => value === raw) ?? null;

/** `?campaign=` is the link the campaign list and card already use (CABINET_LINKS.campaignStats). */
export function parseStatsFilters(params: URLSearchParams): StatsFilters {
  return {
    campaignId: params.get('campaign') || null,
    period: pick(STATS_PERIODS, params.get('period')),
    scope: pick(STATS_SCOPES, params.get('scope')) ?? 'all',
    step: pick(CHART_STEPS, params.get('step')),
  };
}

/** Defaults stay out of the URL; other params (e.g. `?demo=`) are kept. */
export function writeStatsFilters(prev: URLSearchParams, filters: StatsFilters): URLSearchParams {
  const next = new URLSearchParams(prev);
  const set = (key: string, value: string | null) => (value ? next.set(key, value) : next.delete(key));
  set('campaign', filters.campaignId);
  set('period', filters.period);
  set('scope', filters.scope === 'all' ? null : filters.scope);
  set('step', filters.step);
  return next;
}
