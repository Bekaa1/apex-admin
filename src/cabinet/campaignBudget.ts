import type { Database } from '../lib/database.types';

type StatsRow = Database['public']['Views']['my_campaigns_stats']['Row'];

/** Budget is «almost spent» when this share or less is left. */
export const LOW_BUDGET_SHARE = 0.15;

export interface BudgetFigures {
  budget: number;
  spent: number;
  left: number;
  /** 0–100, for the meter. */
  spentPct: number;
  /** A running campaign with ≤ LOW_BUDGET_SHARE of the budget left. */
  low: boolean;
  /** The budget ran out: by status, or nothing is left while the campaign runs. */
  ended: boolean;
}

export function budgetFigures(row: Pick<StatsRow, 'status' | 'budget' | 'spent_budget' | 'remaining_budget'>): BudgetFigures {
  const budget = row.budget ?? 0;
  const spent = row.spent_budget ?? 0;
  const left = Math.max(row.remaining_budget ?? budget - spent, 0);
  const running = row.status === 'active' || row.status === 'paused';
  const ended = row.status === 'budget_ended' || (running && budget > 0 && left === 0);
  return {
    budget,
    spent,
    left,
    spentPct: budget > 0 ? Math.min((spent / budget) * 100, 100) : 0,
    low: !ended && running && budget > 0 && left / budget <= LOW_BUDGET_SHARE,
    ended,
  };
}
