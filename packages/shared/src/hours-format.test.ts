import { describe, expect, it } from 'vitest';
import { formatWeeklyHours } from './hours-format.js';
import type { Weekday } from './constants.js';
import type { TimeRange, WeeklyHours } from './types.js';

const dailyHours: TimeRange[] = [{ open: '09:30', close: '18:00' }];

function makeHours(overrides: Partial<Record<Weekday, TimeRange[]>> = {}): WeeklyHours {
  return {
    days: {
      mon: overrides.mon ?? dailyHours,
      tue: overrides.tue ?? dailyHours,
      wed: overrides.wed ?? dailyHours,
      thu: overrides.thu ?? dailyHours,
      fri: overrides.fri ?? dailyHours,
      sat: overrides.sat ?? dailyHours,
      sun: overrides.sun ?? dailyHours,
    },
  };
}

describe('formatWeeklyHours', () => {
  it('puts a closed weekday after the open days', () => {
    expect(formatWeeklyHours(makeHours({ mon: [] }))).toEqual(['화~일 09:30–18:00', '월 휴무']);
  });

  it('formats identical hours for every day as daily hours', () => {
    const hours = [{ open: '09:00', close: '18:00' }];
    expect(
      formatWeeklyHours(
        makeHours({
          mon: hours,
          tue: hours,
          wed: hours,
          thu: hours,
          fri: hours,
          sat: hours,
          sun: hours,
        }),
      ),
    ).toEqual(['매일 09:00–18:00']);
  });

  it('formats split hours and groups separated closed days', () => {
    expect(
      formatWeeklyHours(
        makeHours({
          mon: [],
          tue: [
            { open: '11:00', close: '14:30' },
            { open: '17:00', close: '21:00' },
          ],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        }),
      ),
    ).toEqual(['화 11:00–14:30, 17:00–21:00', '월·수~일 휴무']);
  });

  it('lists weekday hours before weekend hours', () => {
    expect(
      formatWeeklyHours(
        makeHours({
          sat: [{ open: '10:00', close: '22:00' }],
          sun: [{ open: '10:00', close: '22:00' }],
        }),
      ),
    ).toEqual(['월~금 09:30–18:00', '토·일 10:00–22:00']);
  });

  it('formats a week of closures as daily closure', () => {
    expect(
      formatWeeklyHours(
        makeHours({
          mon: [],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        }),
      ),
    ).toEqual(['매일 휴무']);
  });
});
