import { describe, expect, it } from 'vitest';
import { spotsFileSchema, toMinutes, weekdayOf } from '@cheongdo/shared';
import type { DayPlan, DayQuery, DayPlanItem, Spot, Weekday } from '@cheongdo/shared';
import { fitVisit } from '../../src/domain/opening.js';
import { planDay } from '../../src/domain/plan-day.js';
import { fixtureSpots } from '../fixtures/spots.js';

type ExpectedItem = [
  DayPlanItem['type'],
  DayPlanItem['meal'] | null,
  string,
  number,
  number,
  number,
  string,
  string,
  number,
  string[],
];

interface Scenario {
  name: string;
  query: DayQuery;
  spots?: Spot[];
  items: ExpectedItem[];
  excluded: [string, 'NOT_ENOUGH_TIME' | 'CLOSED_ON_DAY'][];
  totals: DayPlan['totals'];
  notices: string[];
}

const familyQuery = (date: string, start: string, end: string): DayQuery => ({
  date,
  start,
  end,
  with: 'family',
  tags: ['nature', 'experience'],
  exclude: [],
});

const scenarios: Scenario[] = [
  {
    name: 'S1 basic day',
    query: familyQuery('2026-11-07', '10:00', '19:00'),
    items: [
      ['visit', null, 's-temple', 0, 0, 0, '10:00', '10:40', 10, ['nature']],
      ['visit', null, 's-forest', 10, 0, 2.2, '10:50', '11:50', 15, ['nature']],
      ['meal', 'lunch', 'r-allday', 10, 0, 1.4, '12:00', '13:00', 0, []],
      ['rest', null, 'c-near', 10, 0, 1.8, '13:10', '13:40', 0, []],
      ['visit', null, 's-luge', 10, 0, 0.7, '13:50', '14:50', 15, ['experience']],
      ['visit', null, 's-museum', 10, 0, 2.1, '15:00', '16:00', 5, []],
      ['visit', null, 's-tunnel', 20, 0, 5.8, '16:20', '17:20', 5, []],
      ['meal', 'dinner', 'r-break', 20, 0, 5, '17:40', '18:40', 0, []],
    ],
    excluded: [['s-lights', 'NOT_ENOUGH_TIME']],
    totals: {
      visitCount: 5,
      stayMinutes: 430,
      travelMinutes: 90,
      startAt: '10:00',
      endAt: '18:40',
      slackMinutes: 20,
    },
    notices: [],
  },
  {
    name: 'S2 waits for opening',
    query: familyQuery('2026-11-07', '08:00', '14:00'),
    items: [
      ['visit', null, 's-temple', 0, 60, 0, '09:00', '09:40', 10, ['nature']],
      ['visit', null, 's-forest', 10, 0, 2.2, '09:50', '10:50', 15, ['nature']],
      ['visit', null, 's-luge', 10, 0, 1.1, '11:00', '12:00', 15, ['experience']],
      ['meal', 'lunch', 'r-break', 10, 0, 0.7, '12:10', '13:10', 0, []],
      ['rest', null, 'c-near', 10, 0, 0.1, '13:20', '13:50', 0, []],
    ],
    excluded: [
      ['s-lights', 'NOT_ENOUGH_TIME'],
      ['s-museum', 'NOT_ENOUGH_TIME'],
      ['s-tunnel', 'NOT_ENOUGH_TIME'],
    ],
    totals: {
      visitCount: 3,
      stayMinutes: 250,
      travelMinutes: 40,
      startAt: '08:00',
      endAt: '13:50',
      slackMinutes: 70,
    },
    notices: [],
  },
  {
    name: 'S3 late departure skips lunch',
    query: familyQuery('2026-11-07', '12:30', '18:00'),
    items: [
      ['visit', null, 's-temple', 0, 0, 0, '12:30', '13:10', 10, ['nature']],
      ['visit', null, 's-forest', 10, 0, 2.2, '13:20', '14:20', 15, ['nature']],
      ['visit', null, 's-luge', 10, 0, 1.1, '14:30', '15:30', 15, ['experience']],
      ['visit', null, 's-lights', 10, 20, 1.4, '16:00', '17:30', 15, ['experience']],
    ],
    excluded: [
      ['s-museum', 'NOT_ENOUGH_TIME'],
      ['s-tunnel', 'NOT_ENOUGH_TIME'],
    ],
    totals: {
      visitCount: 4,
      stayMinutes: 250,
      travelMinutes: 30,
      startAt: '12:30',
      endAt: '17:30',
      slackMinutes: 50,
    },
    notices: [],
  },
  {
    name: 'S4 adds a night visit after dinner',
    query: familyQuery('2026-11-07', '10:00', '21:00'),
    items: [
      ['visit', null, 's-temple', 0, 0, 0, '10:00', '10:40', 10, ['nature']],
      ['visit', null, 's-forest', 10, 0, 2.2, '10:50', '11:50', 15, ['nature']],
      ['meal', 'lunch', 'r-allday', 10, 0, 1.4, '12:00', '13:00', 0, []],
      ['rest', null, 'c-near', 10, 0, 1.8, '13:10', '13:40', 0, []],
      ['visit', null, 's-luge', 10, 0, 0.7, '13:50', '14:50', 15, ['experience']],
      ['visit', null, 's-museum', 10, 0, 2.1, '15:00', '16:00', 5, []],
      ['visit', null, 's-tunnel', 20, 0, 5.8, '16:20', '17:20', 5, []],
      ['meal', 'dinner', 'r-break', 20, 0, 5, '17:40', '18:40', 0, []],
      ['visit', null, 's-lights', 10, 0, 1.7, '18:50', '20:20', 15, ['experience']],
    ],
    excluded: [],
    totals: {
      visitCount: 6,
      stayMinutes: 520,
      travelMinutes: 100,
      startAt: '10:00',
      endAt: '20:20',
      slackMinutes: 40,
    },
    notices: [],
  },
  {
    name: 'S5 excludes places closed on Monday',
    query: {
      ...familyQuery('2026-11-09', '10:00', '17:00'),
      tags: ['history', 'experience'],
    },
    items: [
      ['visit', null, 's-temple', 0, 0, 0, '10:00', '10:40', 10, ['history']],
      ['visit', null, 's-forest', 10, 0, 2.2, '10:50', '11:50', 5, []],
      ['meal', 'lunch', 'r-break', 10, 0, 0.7, '12:00', '13:00', 0, []],
      ['rest', null, 'c-near', 10, 0, 0.1, '13:10', '13:40', 0, []],
      ['visit', null, 's-tunnel', 20, 0, 4.9, '14:00', '15:00', 5, []],
    ],
    excluded: [
      ['s-lights', 'NOT_ENOUGH_TIME'],
      ['s-luge', 'CLOSED_ON_DAY'],
      ['s-museum', 'CLOSED_ON_DAY'],
    ],
    totals: {
      visitCount: 3,
      stayMinutes: 250,
      travelMinutes: 50,
      startAt: '10:00',
      endAt: '15:00',
      slackMinutes: 120,
    },
    notices: [],
  },
  {
    name: 'S6 continues when restaurants are closed',
    query: familyQuery('2026-11-09', '10:00', '17:00'),
    spots: fixtureSpots.map((spot) =>
      spot.kind === 'restaurant'
        ? { ...spot, hours: { ...spot.hours, days: { ...spot.hours.days, mon: [] } } }
        : spot,
    ),
    items: [
      ['visit', null, 's-temple', 0, 0, 0, '10:00', '10:40', 10, ['nature']],
      ['visit', null, 's-forest', 10, 0, 2.2, '10:50', '11:50', 15, ['nature']],
      ['visit', null, 's-tunnel', 20, 0, 5.6, '12:10', '13:10', 5, []],
    ],
    excluded: [
      ['s-lights', 'NOT_ENOUGH_TIME'],
      ['s-luge', 'CLOSED_ON_DAY'],
      ['s-museum', 'CLOSED_ON_DAY'],
    ],
    totals: {
      visitCount: 3,
      stayMinutes: 160,
      travelMinutes: 30,
      startAt: '10:00',
      endAt: '13:10',
      slackMinutes: 230,
    },
    notices: ['이 시간에 영업하는 식당을 찾지 못했어요'],
  },
  {
    name: 'S7 uses companion-only candidates as supplements',
    query: {
      ...familyQuery('2026-11-07', '10:00', '17:00'),
      with: 'solo',
      tags: ['food'],
    },
    items: [
      ['visit', null, 's-tunnel', 0, 0, 0, '10:00', '11:00', 10, ['food']],
      ['visit', null, 's-museum', 20, 0, 5.8, '11:20', '12:20', 5, []],
      ['meal', 'lunch', 'r-allday', 10, 0, 1.4, '12:30', '13:30', 0, []],
      ['rest', null, 'c-near', 10, 0, 1.8, '13:40', '14:10', 0, []],
      ['visit', null, 's-temple', 15, 0, 2.9, '14:25', '15:05', 5, []],
    ],
    excluded: [],
    totals: {
      visitCount: 3,
      stayMinutes: 250,
      travelMinutes: 55,
      startAt: '10:00',
      endAt: '15:05',
      slackMinutes: 115,
    },
    notices: [],
  },
  {
    name: 'S8 honors excluded places',
    query: {
      ...familyQuery('2026-11-07', '10:00', '19:00'),
      exclude: ['s-forest'],
    },
    items: [
      ['visit', null, 's-luge', 0, 0, 0, '10:00', '11:00', 15, ['experience']],
      ['visit', null, 's-temple', 15, 0, 3.3, '11:15', '11:55', 10, ['nature']],
      ['meal', 'lunch', 'r-allday', 10, 0, 1.4, '12:05', '13:05', 0, []],
      ['rest', null, 'c-near', 10, 0, 1.8, '13:15', '13:45', 0, []],
      ['visit', null, 's-museum', 10, 0, 1.4, '13:55', '14:55', 5, []],
      ['visit', null, 's-tunnel', 20, 0, 5.8, '15:15', '16:15', 5, []],
      ['meal', 'dinner', 'r-break', 20, 55, 5, '17:30', '18:30', 0, []],
    ],
    excluded: [['s-lights', 'NOT_ENOUGH_TIME']],
    totals: {
      visitCount: 4,
      stayMinutes: 370,
      travelMinutes: 85,
      startAt: '10:00',
      endAt: '18:30',
      slackMinutes: 85,
    },
    notices: [],
  },
];

function itemValues(item: DayPlanItem): ExpectedItem {
  return [
    item.type,
    item.meal ?? null,
    item.spot.id,
    item.travelMinutes,
    item.waitMinutes,
    item.distanceKm,
    item.arriveAt,
    item.leaveAt,
    item.score,
    item.matchedTags,
  ];
}

function assertScheduleProperties(
  result: DayPlan,
  spots: Spot[],
  query: DayQuery,
  weekday: Weekday,
): void {
  const startMinute = toMinutes(query.start);
  const endMinute = toMinutes(query.end);
  const spotsById = new Map(spots.map((spot) => [spot.id, spot]));

  result.items.forEach((item, index) => {
    const previousLeave = index === 0 ? startMinute : toMinutes(result.items[index - 1]!.leaveAt);
    expect(toMinutes(item.arriveAt)).toBe(previousLeave + item.travelMinutes + item.waitMinutes);
    expect(toMinutes(item.leaveAt)).toBeLessThanOrEqual(endMinute);

    const spot = spotsById.get(item.spot.id);
    expect(spot).toBeDefined();
    expect(
      fitVisit(
        spot!,
        weekday,
        toMinutes(item.arriveAt),
        toMinutes(item.leaveAt) - toMinutes(item.arriveAt),
      ),
    ).toEqual({ arriveMinute: toMinutes(item.arriveAt), waitMinutes: 0 });
  });
}

describe('fixtureSpots', () => {
  it('satisfies spotsFileSchema', () => {
    expect(spotsFileSchema.safeParse(fixtureSpots).success).toBe(true);
  });
});

describe('planDay', () => {
  it.each(scenarios)(
    '$name',
    ({ query, spots = fixtureSpots, items, excluded, totals, notices }) => {
      const spotsBefore = structuredClone(spots);
      const queryBefore = structuredClone(query);
      const weekday = weekdayOf(query.date);
      const result = planDay(spots, query);

      expect(result.conditions).toEqual({ ...query, weekday });
      expect(result.items.map(itemValues)).toEqual(items);
      expect(result.excluded.map(({ spot, reason }) => [spot.id, reason])).toEqual(excluded);
      expect(result.totals).toEqual(totals);
      expect(result.notices).toEqual(notices);
      expect(planDay(spots, query)).toEqual(result);
      expect(planDay([...spots].reverse(), query)).toEqual(result);
      expect(spots).toEqual(spotsBefore);
      expect(query).toEqual(queryBefore);
      assertScheduleProperties(result, spots, query, weekday);

      for (const item of result.items) {
        const originalSpot = spots.find((spot) => spot.id === item.spot.id);
        if (originalSpot?.images.length) {
          expect(item.spot.image).toEqual(originalSpot.images[0]);
        } else {
          expect(item.spot).not.toHaveProperty('image');
        }
      }
    },
  );

  it('includes the first image as the summary image without mutating its spot', () => {
    const image = {
      url: 'https://example.com/forest.jpg',
      alt: 'forest',
      license: 'kogl-1' as const,
      credit: 'test',
    };
    const spots = fixtureSpots.map((spot) =>
      spot.id === 's-forest' ? { ...spot, images: [image] } : spot,
    );
    const result = planDay(spots, familyQuery('2026-11-07', '10:00', '19:00'));

    expect(result.items.find(({ spot }) => spot.id === 's-forest')?.spot.image).toEqual(image);
    expect(spots.find(({ id }) => id === 's-forest')?.images).toEqual([image]);
  });
});
