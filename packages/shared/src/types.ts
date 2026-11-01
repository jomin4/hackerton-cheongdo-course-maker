import type { Companion, Kind, Meal, Tag, Weekday, Zone } from './constants.js';

export interface TimeRange {
  open: string;
  close: string;
}

export interface WeeklyHours {
  days: Record<Weekday, TimeRange[]>;
  lastEntryBeforeCloseMinutes?: number;
  note?: string;
}

export interface SpotImage {
  url: string;
  alt: string;
  license: 'kogl-1';
  credit: string;
}

export interface Spot {
  id: string;
  kind: Kind;
  name: string;
  summary: string;
  description: string[];
  tips: string[];
  zone: Zone;
  location: { lat: number; lng: number };
  tags: Tag[];
  goodFor: Companion[];
  stayMinutes: number;
  meals?: Meal[];
  address: string;
  hours: WeeklyHours;
  fee?: string;
  phone?: string;
  images: SpotImage[];
  source: string;
  sourceRef?: { provider: 'tourapi'; contentId: string };
  checkedAt: string;
}

export type SpotSummary = Pick<
  Spot,
  'id' | 'kind' | 'name' | 'summary' | 'zone' | 'tags' | 'stayMinutes' | 'location'
> & { image?: SpotImage };

export interface DayQuery {
  date: string;
  start: string;
  end: string;
  with: Companion;
  tags: Tag[];
  exclude: string[];
}

export interface DayPlanItem {
  order: number;
  type: 'visit' | 'meal' | 'rest';
  meal?: Meal;
  spot: SpotSummary;
  travelMinutes: number;
  waitMinutes: number;
  distanceKm: number;
  arriveAt: string;
  leaveAt: string;
  matchedTags: Tag[];
  score: number;
}

export type ExcludedReason = 'NOT_ENOUGH_TIME' | 'CLOSED_ON_DAY';

export interface ExcludedSpot {
  spot: SpotSummary;
  reason: ExcludedReason;
}

export interface DayPlanTotals {
  visitCount: number;
  stayMinutes: number;
  travelMinutes: number;
  startAt: string;
  endAt: string;
  slackMinutes: number;
}

export interface DayPlan {
  conditions: DayQuery & { weekday: Weekday };
  items: DayPlanItem[];
  excluded: ExcludedSpot[];
  totals: DayPlanTotals;
  notices: string[];
}
