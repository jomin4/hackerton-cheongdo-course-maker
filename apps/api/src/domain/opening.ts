import { toMinutes } from '@cheongdo/shared';
import type { Spot, Weekday } from '@cheongdo/shared';

export interface VisitFit {
  arriveMinute: number;
  waitMinutes: number;
}

export function fitVisit(
  spot: Spot,
  weekday: Weekday,
  arriveMinute: number,
  stayMinutes: number,
): VisitFit | null {
  const ranges = spot.hours.days[weekday];
  const lastEntry = spot.hours.lastEntryBeforeCloseMinutes ?? 0;

  for (const range of ranges) {
    const openMinute = toMinutes(range.open);
    const closeMinute = toMinutes(range.close);
    const fitArrival = Math.max(arriveMinute, openMinute);

    if (fitArrival + stayMinutes <= closeMinute && fitArrival <= closeMinute - lastEntry) {
      return {
        arriveMinute: fitArrival,
        waitMinutes: fitArrival - arriveMinute,
      };
    }
  }

  return null;
}
