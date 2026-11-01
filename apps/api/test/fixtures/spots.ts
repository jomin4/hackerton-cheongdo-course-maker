import type { Spot, Weekday } from '@cheongdo/shared';

const weekdays: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function dailyHours(open: string, close: string): Spot['hours'] {
  return {
    days: Object.fromEntries(
      weekdays.map((weekday) => [weekday, [{ open, close }]]),
    ) as Spot['hours']['days'],
  };
}

function weekdayHours(open: string, close: string, closedOnMonday = false): Spot['hours'] {
  return {
    days: Object.fromEntries(
      weekdays.map((weekday) => [
        weekday,
        closedOnMonday && weekday === 'mon' ? [] : [{ open, close }],
      ]),
    ) as Spot['hours']['days'],
  };
}

function createSpot(
  id: string,
  kind: Spot['kind'],
  lat: number,
  lng: number,
  tags: Spot['tags'],
  goodFor: Spot['goodFor'],
  stayMinutes: number,
  hours: Spot['hours'],
  options: { meals?: Spot['meals']; lastEntryBeforeCloseMinutes?: number } = {},
): Spot {
  return {
    id,
    kind,
    name: id,
    summary: `${id} summary`,
    description: ['d'],
    tips: [],
    zone: 'hwayang-eup',
    location: { lat, lng },
    tags,
    goodFor,
    stayMinutes,
    ...(options.meals ? { meals: options.meals } : {}),
    address: '경상북도 청도군',
    hours: {
      ...hours,
      ...(options.lastEntryBeforeCloseMinutes === undefined
        ? {}
        : { lastEntryBeforeCloseMinutes: options.lastEntryBeforeCloseMinutes }),
    },
    images: [],
    source: 'test',
    checkedAt: '2026-10-31',
  };
}

export const fixtureSpots: Spot[] = [
  createSpot(
    's-forest',
    'spot',
    35.65,
    128.73,
    ['nature'],
    ['couple', 'family'],
    60,
    dailyHours('09:00', '18:00'),
  ),
  createSpot(
    's-luge',
    'spot',
    35.66,
    128.73,
    ['experience'],
    ['family', 'friends'],
    60,
    weekdayHours('10:00', '18:00', true),
  ),
  createSpot(
    's-museum',
    'spot',
    35.65,
    128.75,
    ['history'],
    ['solo', 'family'],
    60,
    weekdayHours('09:00', '18:00', true),
    { lastEntryBeforeCloseMinutes: 30 },
  ),
  createSpot(
    's-temple',
    'spot',
    35.63,
    128.73,
    ['history', 'nature'],
    ['solo', 'couple'],
    40,
    dailyHours('09:00', '18:00'),
  ),
  createSpot(
    's-lights',
    'spot',
    35.67,
    128.74,
    ['photo', 'experience'],
    ['couple', 'family', 'friends'],
    90,
    dailyHours('16:00', '22:00'),
  ),
  createSpot(
    's-tunnel',
    'spot',
    35.7,
    128.73,
    ['food', 'photo'],
    ['couple', 'family', 'friends'],
    60,
    dailyHours('09:30', '17:45'),
  ),
  createSpot(
    'r-break',
    'restaurant',
    35.655,
    128.735,
    [],
    ['family'],
    60,
    {
      days: Object.fromEntries(
        weekdays.map((weekday) => [
          weekday,
          [
            { open: '11:00', close: '14:30' },
            { open: '17:00', close: '21:00' },
          ],
        ]),
      ) as Spot['hours']['days'],
    },
    { meals: ['lunch', 'dinner'] },
  ),
  createSpot(
    'r-allday',
    'restaurant',
    35.64,
    128.74,
    [],
    ['family'],
    60,
    weekdayHours('10:00', '20:00', true),
    { meals: ['lunch', 'dinner'] },
  ),
  createSpot(
    'r-lunch',
    'restaurant',
    35.665,
    128.735,
    [],
    ['family'],
    60,
    weekdayHours('11:00', '15:00', true),
    { meals: ['lunch'] },
  ),
  createSpot('c-near', 'cafe', 35.656, 128.736, [], ['family'], 30, dailyHours('10:00', '21:00')),
  createSpot(
    'c-far',
    'cafe',
    35.68,
    128.73,
    [],
    ['family'],
    40,
    weekdayHours('11:00', '19:00', true),
  ),
];
