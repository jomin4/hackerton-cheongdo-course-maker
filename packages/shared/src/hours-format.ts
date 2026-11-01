import { WEEKDAYS, WEEKDAY_LABELS } from './constants.js';
import type { Weekday } from './constants.js';
import type { WeeklyHours } from './types.js';

function formatDayGroup(days: Weekday[]): string {
  const runs: Weekday[][] = [];

  for (const day of days) {
    const weekdayIndex = WEEKDAYS.indexOf(day);
    const currentRun = runs.at(-1);
    const previousDay = currentRun?.at(-1);
    const previousIndex = previousDay === undefined ? -2 : WEEKDAYS.indexOf(previousDay);

    if (weekdayIndex === previousIndex + 1) {
      currentRun?.push(day);
    } else {
      runs.push([day]);
    }
  }

  return runs
    .map((run) => {
      if (run.length >= 3) {
        return `${WEEKDAY_LABELS[run[0]!]}~${WEEKDAY_LABELS[run[run.length - 1]!]}`;
      }
      return run.map((day) => WEEKDAY_LABELS[day]).join('·');
    })
    .join('·');
}

function formatRanges(ranges: WeeklyHours['days'][Weekday]): string {
  return ranges.map(({ open, close }) => `${open}–${close}`).join(', ');
}

export function formatWeeklyHours(hours: WeeklyHours): string[] {
  const groups = new Map<string, Weekday[]>();

  for (const weekday of WEEKDAYS) {
    const rangeText = formatRanges(hours.days[weekday]);
    const group = groups.get(rangeText);
    if (group) {
      group.push(weekday);
    } else {
      groups.set(rangeText, [weekday]);
    }
  }

  if (groups.size === 1) {
    const [rangeText] = groups.keys();
    return [rangeText ? `매일 ${rangeText}` : '매일 휴무'];
  }

  const lines: string[] = [];
  for (const [rangeText, days] of groups) {
    if (rangeText) {
      lines.push(`${formatDayGroup(days)} ${rangeText}`);
    }
  }

  const closedDays = groups.get('');
  if (closedDays) {
    lines.push(`${formatDayGroup(closedDays)} 휴무`);
  }

  return lines;
}
