import { describe, expect, it } from 'vitest';

import {
  defaultDayQuery,
  endOptions,
  fromDaySearchParams,
  sortTags,
  START_OPTIONS,
  toCourseUrl,
} from './query.js';

describe('day query', () => {
  it('creates start options and end options within the day limits', () => {
    expect(START_OPTIONS).toHaveLength(13);
    expect(START_OPTIONS[0]).toBe('08:00');
    expect(START_OPTIONS.at(-1)).toBe('14:00');
    expect(endOptions('14:00')).toEqual([
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
      '20:30',
      '21:00',
    ]);
  });

  it('uses the default day conditions and orders tags in the shared order', () => {
    expect(defaultDayQuery('2026-11-07')).toEqual({
      date: '2026-11-07',
      start: '10:00',
      end: '19:00',
      with: 'family',
      tags: ['nature', 'experience'],
      exclude: [],
    });
    expect(sortTags(['photo', 'nature', 'experience'])).toEqual(['nature', 'experience', 'photo']);
  });

  it('creates a stable course URL with a fixed parameter order', () => {
    expect(toCourseUrl(defaultDayQuery('2026-11-07'))).toBe(
      '/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience',
    );
    expect(
      toCourseUrl({
        ...defaultDayQuery('2026-11-07'),
        exclude: ['spot-b', 'spot-a'],
      }),
    ).toBe(
      '/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience&exclude=spot-b,spot-a',
    );
  });

  it('falls back to today for invalid dates and times outside the selected day', () => {
    expect(
      fromDaySearchParams(new URLSearchParams('date=2026-10-31&start=07%3A30'), '2026-11-01'),
    ).toMatchObject({ date: '2026-11-01', start: '10:00', end: '19:00' });
    expect(fromDaySearchParams(new URLSearchParams('date=2026-02-30'), '2026-11-01').date).toBe(
      '2026-11-01',
    );
  });

  it('keeps a valid start and chooses a valid default end for late starts', () => {
    expect(fromDaySearchParams(new URLSearchParams('start=14%3A00'), '2026-11-01').end).toBe(
      '19:00',
    );
    expect(
      fromDaySearchParams(new URLSearchParams('start=14%3A00&end=16%3A00'), '2026-11-01').end,
    ).toBe('17:00');
  });

  it('uses default interests only when the tags parameter is absent', () => {
    expect(
      fromDaySearchParams(new URLSearchParams('tags=photo,nature,experience,nature'), '2026-11-01')
        .tags,
    ).toEqual(['nature', 'experience', 'photo']);
    expect(fromDaySearchParams(new URLSearchParams('tags='), '2026-11-01').tags).toEqual([]);
    expect(fromDaySearchParams(new URLSearchParams(), '2026-11-01').tags).toEqual([
      'nature',
      'experience',
    ]);
  });
});
