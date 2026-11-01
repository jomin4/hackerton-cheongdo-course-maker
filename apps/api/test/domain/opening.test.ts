import { describe, expect, it } from 'vitest';
import type { Spot, Weekday } from '@cheongdo/shared';
import { fitVisit } from '../../src/domain/opening.js';

const weekdays: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function createSpot(days: Spot['hours']['days'], lastEntryBeforeCloseMinutes?: number): Spot {
  return {
    id: 'test-place',
    kind: 'spot',
    name: 'test place',
    summary: 'test summary',
    description: ['test'],
    tips: [],
    zone: 'hwayang-eup',
    location: { lat: 35.65, lng: 128.73 },
    tags: ['nature'],
    goodFor: ['family'],
    stayMinutes: 40,
    address: '경상북도 청도군',
    hours: {
      days,
      ...(lastEntryBeforeCloseMinutes === undefined ? {} : { lastEntryBeforeCloseMinutes }),
    },
    images: [],
    source: 'test',
    checkedAt: '2026-10-31',
  };
}

const closedMondaySpot = createSpot(
  Object.fromEntries(
    weekdays.map((weekday) => [
      weekday,
      weekday === 'mon' ? [] : [{ open: '09:00', close: '18:00' }],
    ]),
  ) as Spot['hours']['days'],
  15,
);

const restaurantWithBreak = createSpot(
  Object.fromEntries(
    weekdays.map((weekday) => [
      weekday,
      [
        { open: '11:00', close: '14:30' },
        { open: '17:00', close: '21:00' },
      ],
    ]),
  ) as Spot['hours']['days'],
);

describe('fitVisit', () => {
  it('waits until the first opening interval', () => {
    expect(fitVisit(closedMondaySpot, 'sat', 480, 40)).toEqual({
      arriveMinute: 540,
      waitMinutes: 60,
    });
  });

  it('rejects a visit that cannot finish before closing', () => {
    expect(fitVisit(closedMondaySpot, 'sat', 1050, 40)).toBeNull();
  });

  it('enforces last entry before closing', () => {
    expect(fitVisit(closedMondaySpot, 'sat', 1066, 10)).toBeNull();
    expect(fitVisit(closedMondaySpot, 'sat', 1065, 10)).toEqual({
      arriveMinute: 1065,
      waitMinutes: 0,
    });
  });

  it('waits through a break between opening intervals', () => {
    expect(fitVisit(restaurantWithBreak, 'tue', 900, 60)).toEqual({
      arriveMinute: 1020,
      waitMinutes: 120,
    });
    expect(fitVisit(restaurantWithBreak, 'tue', 840, 60)).toEqual({
      arriveMinute: 1020,
      waitMinutes: 180,
    });
  });

  it('returns null on a closed weekday', () => {
    expect(fitVisit(closedMondaySpot, 'mon', 600, 30)).toBeNull();
  });
});
