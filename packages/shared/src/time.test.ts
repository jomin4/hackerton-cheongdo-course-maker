import { describe, expect, it } from 'vitest';
import { isValidDate, toClock, toMinutes, weekdayOf } from './time.js';

declare const process: { env: Record<string, string | undefined> };

describe('time conversion', () => {
  it('converts between clock strings and minutes', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toClock(570)).toBe('09:30');
    expect(toClock(1260)).toBe('21:00');
  });
});

describe('weekdayOf', () => {
  it.each([
    ['2026-11-07', 'sat'],
    ['2026-11-09', 'mon'],
    ['2026-01-01', 'thu'],
  ] as const)('returns %s as %s', (date, weekday) => {
    expect(weekdayOf(date)).toBe(weekday);
  });

  it('does not depend on the process timezone', () => {
    const originalTimezone = process.env.TZ;

    try {
      process.env.TZ = 'America/Los_Angeles';
      expect(weekdayOf('2026-11-09')).toBe('mon');
      process.env.TZ = 'Asia/Seoul';
      expect(weekdayOf('2026-11-09')).toBe('mon');
    } finally {
      if (originalTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimezone;
      }
    }
  });
});

describe('isValidDate', () => {
  it.each([
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-1-5', false],
    ['2028-02-29', true],
    ['2026-02-28', true],
  ])('validates %s', (date, expected) => {
    expect(isValidDate(date)).toBe(expected);
  });
});
