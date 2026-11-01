import { WEEKDAY_LABELS, weekdayOf } from '@cheongdo/shared';

export function todayInSeoul(now: Date): string {
  const seoulTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return seoulTime.toISOString().slice(0, 10);
}

export function formatDateLabel(date: string): string {
  const [, month, day] = date.split('-');
  const weekday = weekdayOf(date);
  return `${Number(month)}월 ${Number(day)}일(${WEEKDAY_LABELS[weekday]})`;
}
