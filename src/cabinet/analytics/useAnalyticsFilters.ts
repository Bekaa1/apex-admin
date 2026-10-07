import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Period, StoreSort } from './types';

export function useAnalyticsFilters(latestDate?: string) {
  const [params, setParams] = useSearchParams();
  const [initialToday] = useState(() => new Date().toISOString().slice(0, 10));
  const today = latestDate ?? initialToday;
  const rawPeriod = params.get('period');
  const period: Period = rawPeriod === '7d' || rawPeriod === '30d' || rawPeriod === 'custom' ? rawPeriod : 'today';
  const from = validDate(params.get('from'), today) ?? today;
  const to = validDate(params.get('to'), today) ?? today;
  const city = params.get('city') || 'all';
  const rawSort = params.get('sort');
  const sort: StoreSort = rawSort === 'online' || rawSort === 'carts' || rawSort === 'name' ? rawSort : 'plays';
  const query = params.get('q') ?? '';

  function update(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true, preventScrollReset: true });
  }

  function setPeriod(nextPeriod: Period) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (nextPeriod === 'today') next.delete('period');
      else next.set('period', nextPeriod);
      if (nextPeriod === 'custom') {
        if (!validDate(next.get('from'), today)) next.set('from', today);
        if (!validDate(next.get('to'), today)) next.set('to', today);
      } else {
        next.delete('from');
        next.delete('to');
      }
      return next;
    }, { replace: true, preventScrollReset: true });
  }

  function setRange(which: 'from' | 'to', value: string, latestDate: string) {
    if (!validDate(value, latestDate)) return;
    const selected = value > latestDate ? latestDate : value;
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('period', 'custom');
      let start = validDate(next.get('from'), latestDate) ?? today;
      let end = validDate(next.get('to'), latestDate) ?? today;
      if (which === 'from') {
        start = selected;
        if (start > end) end = start;
      } else {
        end = selected;
        if (end < start) start = end;
      }
      next.set('from', start);
      next.set('to', end);
      return next;
    }, { replace: true, preventScrollReset: true });
  }

  function reset() {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const key of ['q', 'city', 'sort', 'period', 'from', 'to']) next.delete(key);
      return next;
    }, { replace: true, preventScrollReset: true });
  }

  const search = params.toString() ? '?' + params.toString() : '';
  return { period, city, sort, query, from, to, search, update, setPeriod, setRange, reset };
}

function validDate(value: string | null, latestDate: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return null;
  const valid = date.toISOString().slice(0, 10);
  return valid === value && value <= latestDate ? value : null;
}
