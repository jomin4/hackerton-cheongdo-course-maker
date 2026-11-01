import { describe, expect, it } from 'vitest';

import { formatDateLabel, todayInSeoul } from './date.js';

describe('Seoul dates', () => {
  it('gets today in Seoul regardless of the browser timezone', () => {
    expect(todayInSeoul(new Date('2026-10-31T16:30:00Z'))).toBe('2026-11-01');
    expect(todayInSeoul(new Date('2026-10-31T14:59:00Z'))).toBe('2026-10-31');
  });

  it('formats a date with its Korean weekday label', () => {
    expect(formatDateLabel('2026-11-07')).toBe('11월 7일(토)');
    expect(formatDateLabel('2026-11-09')).toBe('11월 9일(월)');
  });
});
