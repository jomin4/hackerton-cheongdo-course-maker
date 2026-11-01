import { describe, expect, it } from 'vitest';
import {
  spotSchema,
  splitCsv,
  spotsFileSchema,
  spotsQuerySchema,
  dayQuerySchema,
} from './schemas.js';

describe('splitCsv', () => {
  it('trims whitespace, removes empty values, and deduplicates entries', () => {
    expect(splitCsv(' nature, ,food,nature, photo ')).toEqual(['nature', 'food', 'photo']);
  });
});

describe('dayQuerySchema', () => {
  const validQuery = {
    date: '2026-11-07',
    start: '10:00',
    end: '19:00',
    with: 'family',
    tags: 'experience,nature',
  };

  it('parses a valid query and orders tags by TAGS', () => {
    expect(dayQuerySchema.parse(validQuery)).toEqual({
      date: '2026-11-07',
      start: '10:00',
      end: '19:00',
      with: 'family',
      tags: ['nature', 'experience'],
      exclude: [],
    });
  });

  it.each(['2026-02-30', '2026-13-01', undefined])('rejects invalid or missing date %s', (date) => {
    const query = { ...validQuery, date };
    const result = dayQuerySchema.safeParse(query);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('방문 날짜가 올바르지 않아요.');
    }
  });

  it.each(['07:30', '14:30', '10:15', '08:90', undefined])(
    'rejects invalid or missing start %s',
    (start) => {
      const result = dayQuerySchema.safeParse({ ...validQuery, start });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          '시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.',
        );
      }
    },
  );

  it.each(['21:30', '12:30', '10:45', '20:90', undefined])('rejects invalid end %s', (end) => {
    const result = dayQuerySchema.safeParse({ ...validQuery, end });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((issue) => issue.path[0] === 'end')?.message).toBe(
        '끝 시각은 시작보다 3시간 이상 늦고 21:00 이전이어야 해요.',
      );
      if (end === '12:30') {
        expect(result.error.issues.find((issue) => issue.path[0] === 'end')?.path).toEqual(['end']);
      }
    }
  });

  it.each([
    ['14:00', '17:00'],
    ['08:00', '21:00'],
  ])('accepts boundary times %s–%s', (start, end) => {
    expect(dayQuerySchema.safeParse({ ...validQuery, start, end }).success).toBe(true);
  });

  it.each([' , ', undefined])('requires at least one tag for %s', (tags) => {
    const result = dayQuerySchema.safeParse({ ...validQuery, tags });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('관심사를 하나 이상 골라주세요.');
    }
  });

  it.each(['alien', undefined])('rejects invalid companion %s', (withValue) => {
    const result = dayQuerySchema.safeParse({ ...validQuery, with: withValue });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        '동행은 solo, couple, family, friends 중 하나여야 해요.',
      );
    }
  });

  it('rejects v1 course queries with the missing-date message', () => {
    const result = dayQuerySchema.safeParse({ hours: '4', with: 'solo', tags: 'nature' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('방문 날짜가 올바르지 않아요.');
    }
  });

  it('deduplicates and trims exclude entries', () => {
    expect(
      dayQuerySchema.parse({ ...validQuery, exclude: 'rail-bike, unmunsa,rail-bike' }).exclude,
    ).toEqual(['rail-bike', 'unmunsa']);
  });

  it('rejects exclude arrays with a localized message', () => {
    const result = dayQuerySchema.safeParse({ ...validQuery, exclude: ['a', 'b'] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('제외할 장소 값이 올바르지 않아요.');
    }
  });
});

describe('spotsQuerySchema', () => {
  it('accepts a kind filter', () => {
    expect(spotsQuerySchema.parse({ kind: 'cafe' })).toEqual({ kind: 'cafe' });
  });

  it('rejects unknown kind and zone values with localized messages', () => {
    const kindResult = spotsQuerySchema.safeParse({ kind: 'bar' });
    const zoneResult = spotsQuerySchema.safeParse({ zone: 'unknown' });

    expect(kindResult.success).toBe(false);
    if (!kindResult.success) {
      expect(kindResult.error.issues[0]?.message).toBe(
        '종류는 spot, restaurant, cafe 중 하나여야 해요.',
      );
    }

    expect(zoneResult.success).toBe(false);
    if (!zoneResult.success) {
      expect(zoneResult.error.issues[0]?.message).toBe('권역 값이 올바르지 않아요.');
    }
  });

  it('accepts a valid zone filter', () => {
    expect(spotsQuerySchema.parse({ zone: 'gakbuk-myeon' })).toEqual({
      zone: 'gakbuk-myeon',
    });
  });
});

describe('spotSchema', () => {
  const openAllWeek = {
    mon: [{ open: '09:00', close: '18:00' }],
    tue: [{ open: '09:00', close: '18:00' }],
    wed: [{ open: '09:00', close: '18:00' }],
    thu: [{ open: '09:00', close: '18:00' }],
    fri: [{ open: '09:00', close: '18:00' }],
    sat: [{ open: '09:00', close: '18:00' }],
    sun: [{ open: '09:00', close: '18:00' }],
  };

  const validSpot = {
    id: 'test-spot',
    kind: 'spot',
    name: '테스트 장소',
    summary: '테스트 장소 소개',
    description: ['장소 설명이에요.'],
    tips: [],
    zone: 'hwayang-eup',
    location: { lat: 35.65, lng: 128.73 },
    tags: ['nature'],
    goodFor: ['solo'],
    stayMinutes: 30,
    address: '경상북도 청도군 화양읍',
    hours: { days: openAllWeek },
    images: [
      {
        url: 'https://example.com/image.jpg',
        alt: '테스트 이미지',
        license: 'kogl-1',
        credit: '테스트 출처',
      },
    ],
    source: '직접 확인',
    checkedAt: '2026-10-31',
  };

  const validRestaurant = {
    ...validSpot,
    id: 'test-restaurant',
    kind: 'restaurant',
    tags: [],
    meals: ['lunch'],
  };

  const invalid = (changes: object) => spotSchema.safeParse({ ...validSpot, ...changes }).success;

  it('accepts a valid spot and restaurant', () => {
    expect(spotSchema.safeParse(validSpot).success).toBe(true);
    expect(spotSchema.safeParse(validRestaurant).success).toBe(true);
  });

  it('rejects weekday ranges that are not in opening-time order', () => {
    const result = spotSchema.safeParse({
      ...validSpot,
      hours: {
        days: {
          ...openAllWeek,
          mon: [
            { open: '17:00', close: '21:00' },
            { open: '11:00', close: '14:00' },
          ],
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          message: '같은 요일의 영업시간은 이른 시간부터 적어야 해요.',
          path: ['hours', 'days', 'mon', 1, 'open'],
        }),
      );
    }
  });

  it.each([
    ['restaurant without meals', { kind: 'restaurant', tags: [] }],
    ['restaurant with empty meals', { kind: 'restaurant', tags: [], meals: [] }],
    ['spot with meals', { meals: ['lunch'] }],
    ['spot without tags', { tags: [] }],
    [
      'close before open',
      { hours: { days: { ...openAllWeek, mon: [{ open: '18:00', close: '09:00' }] } } },
    ],
    [
      'overlapping ranges',
      {
        hours: {
          days: {
            ...openAllWeek,
            mon: [
              { open: '10:00', close: '14:00' },
              { open: '13:00', close: '18:00' },
            ],
          },
        },
      },
    ],
    [
      'invalid clock',
      { hours: { days: { ...openAllWeek, mon: [{ open: '25:00', close: '26:00' }] } } },
    ],
    ['missing Sunday', { hours: { days: { ...openAllWeek, sun: undefined } } }],
    ['latitude outside Cheongdo', { location: { lat: 37.5, lng: 128.73 } }],
    ['longitude outside Cheongdo', { location: { lat: 35.65, lng: 127.0 } }],
    [
      'unsupported image license',
      {
        images: [
          {
            url: 'https://example.com/image.jpg',
            alt: '이미지',
            license: 'kogl-3',
            credit: '출처',
          },
        ],
      },
    ],
    [
      'non-HTTPS image',
      {
        images: [
          {
            url: 'http://example.com/image.jpg',
            alt: '이미지',
            license: 'kogl-1',
            credit: '출처',
          },
        ],
      },
    ],
    ['missing checkedAt', { checkedAt: undefined }],
    ['invalid checkedAt', { checkedAt: '2026-02-30' }],
  ])('rejects %s', (_description, changes) => {
    expect(invalid(changes)).toBe(false);
  });

  it('accepts adjacent ranges and cafes without tags or images', () => {
    const adjacent = {
      ...validSpot,
      hours: {
        days: {
          ...openAllWeek,
          mon: [
            { open: '11:00', close: '15:00' },
            { open: '15:00', close: '21:00' },
          ],
        },
      },
    };
    const cafe = { ...validSpot, kind: 'cafe', tags: [], images: [] };

    expect(spotSchema.safeParse(adjacent).success).toBe(true);
    expect(spotSchema.safeParse(cafe).success).toBe(true);
  });
});

describe('spotsFileSchema', () => {
  it('rejects duplicate spot ids', () => {
    const validSpot = spotSchema.parse({
      id: 'test-spot',
      kind: 'spot',
      name: '테스트 장소',
      summary: '테스트 장소 소개',
      description: ['장소 설명이에요.'],
      tips: [],
      zone: 'hwayang-eup',
      location: { lat: 35.65, lng: 128.73 },
      tags: ['nature'],
      goodFor: ['solo'],
      stayMinutes: 30,
      address: '경상북도 청도군 화양읍',
      hours: {
        days: {
          mon: [],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
      },
      images: [],
      source: '직접 확인',
      checkedAt: '2026-10-31',
    });

    expect(spotsFileSchema.safeParse([validSpot, validSpot]).success).toBe(false);
  });
});
