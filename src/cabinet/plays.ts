import type { Database } from '../lib/database.types';

/** `my_daily_plays_by_campaign`: plays per campaign per day, days counted in Asia/Almaty. */
export type DailyPlaysRow = Pick<Database['public']['Views']['my_daily_plays_by_campaign']['Row'], 'ad_id' | 'play_date' | 'plays'>;

/** Plays per campaign from `from` to `to` inclusive (YYYY-MM-DD). */
export function playsByCampaign(rows: DailyPlaysRow[], from: string, to: string): Map<string, number> {
  const plays = new Map<string, number>();
  for (const row of rows) {
    if (!row.ad_id || !row.play_date || row.play_date < from || row.play_date > to) continue;
    plays.set(row.ad_id, (plays.get(row.ad_id) ?? 0) + (row.plays ?? 0));
  }
  return plays;
}

export function totalPlays(plays: Map<string, number>): number {
  let total = 0;
  for (const count of plays.values()) total += count;
  return total;
}
