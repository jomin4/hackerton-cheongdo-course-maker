import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { spotsFileSchema, toMinutes, WEEKDAYS } from '@cheongdo/shared';
import type { Kind, Spot, Zone } from '@cheongdo/shared';

function loadSpots(): Spot[] {
  const contents = readFileSync(new URL('../../data/spots.json', import.meta.url), 'utf8');
  return spotsFileSchema.parse(JSON.parse(contents));
}

const ofKind = (spots: Spot[], kind: Kind) => spots.filter((spot) => spot.kind === kind);

describe('data/spots.json', () => {
  it('satisfies the shared spot schema', () => {
    expect(() => loadSpots()).not.toThrow();
  });

  it('keeps the planned number of places per kind', () => {
    const spots = loadSpots();

    expect(ofKind(spots, 'spot').length).toBeGreaterThanOrEqual(25);
    expect(ofKind(spots, 'spot').length).toBeLessThanOrEqual(30);
    for (const kind of ['restaurant', 'cafe'] as const) {
      expect(ofKind(spots, kind).length).toBeGreaterThanOrEqual(7);
      expect(ofKind(spots, kind).length).toBeLessThanOrEqual(8);
    }
  });

  it('has at least two sightseeing places open after 19:00 for the night block', () => {
    const night = ofKind(loadSpots(), 'spot').filter((spot) =>
      WEEKDAYS.some((day) =>
        spot.hours.days[day].some((range) => toMinutes(range.close) > toMinutes('19:00')),
      ),
    );

    expect(night.length).toBeGreaterThanOrEqual(2);
  });

  it.each<Zone>(['unmun-myeon', 'hwayang-eup', 'cheongdo-eup'])(
    'has a restaurant and a cafe in %s',
    (zone) => {
      const spots = loadSpots().filter((spot) => spot.zone === zone);

      expect(ofKind(spots, 'restaurant').length).toBeGreaterThanOrEqual(1);
      expect(ofKind(spots, 'cafe').length).toBeGreaterThanOrEqual(1);
    },
  );

  it('has a lunch and a dinner restaurant open on every weekday', () => {
    const restaurants = ofKind(loadSpots(), 'restaurant');

    for (const day of WEEKDAYS) {
      for (const meal of ['lunch', 'dinner'] as const) {
        const open = restaurants.filter(
          (spot) => spot.meals?.includes(meal) && spot.hours.days[day].length > 0,
        );
        expect(open.length, `${day} ${meal}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('marks every "always open" place with a recommended-hours note', () => {
    for (const spot of loadSpots()) {
      if (spot.hours.note?.startsWith('상시 개방')) {
        expect(spot.hours.note).toContain('추천 관람 시간');
      }
    }
  });

  it('records a TourAPI reference or an explicit official source for every place', () => {
    for (const spot of loadSpots()) {
      expect(spot.sourceRef !== undefined || spot.source !== '한국관광공사', spot.id).toBe(true);
    }
  });
});
