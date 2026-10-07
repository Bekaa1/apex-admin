export type Period = 'today' | '7d' | '30d' | 'custom';
export type StoreSort = 'plays' | 'online' | 'carts' | 'name';

export interface DailyPlays {
  date: string;
  plays: number;
}

export interface StoreInsight {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  createdAt: string | null;
  carts: number | null;
  online: number | null;
  playsToday: number | null;
  playsWeek: number | null;
  playsMonth: number | null;
  playsTotal: number | null;
  daily: DailyPlays[];
}

export interface StoreZone {
  id: string;
  name: string;
  description: string | null;
}

export interface AnalyticsCatalog {
  stores: StoreInsight[];
  today: string;
  availableFrom: string;
}
