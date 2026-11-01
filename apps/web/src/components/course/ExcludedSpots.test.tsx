import type { DayPlan, SpotSummary } from '@cheongdo/shared';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { ExcludedSpots } from './ExcludedSpots.js';

const excludedSpots = Array.from({ length: 7 }, (_, index) => {
  const spot: SpotSummary = {
    id: `spot-${index + 1}`,
    kind: 'spot',
    name: `빠진 장소 ${index + 1}`,
    summary: '둘러볼 수 있어요.',
    zone: 'cheongdo-eup',
    tags: ['nature'],
    stayMinutes: 40,
    location: { lat: 35.65, lng: 128.73 },
  };
  return { spot, reason: 'CLOSED_ON_DAY' as const };
});

const plan: DayPlan = {
  conditions: {
    date: '2026-11-07',
    weekday: 'sat',
    start: '10:00',
    end: '19:00',
    with: 'family',
    tags: ['nature'],
    exclude: [],
  },
  items: [],
  excluded: excludedSpots,
  totals: {
    visitCount: 0,
    stayMinutes: 0,
    travelMinutes: 0,
    startAt: '10:00',
    endAt: '10:00',
    slackMinutes: 540,
  },
  notices: [],
};

afterEach(cleanup);

describe('ExcludedSpots', () => {
  it('initially shows five places and expands the remaining places accessibly', () => {
    render(
      <MemoryRouter>
        <ExcludedSpots plan={plan} />
      </MemoryRouter>,
    );

    const excludedSection = screen.getByRole('region', { name: '이번 일정에서 빠진 장소' });
    expect(within(excludedSection).getAllByRole('listitem')).toHaveLength(5);
    const expandButton = within(excludedSection).getByRole('button', {
      name: '2곳 더 보기',
      expanded: false,
    });

    fireEvent.click(expandButton);

    expect(within(excludedSection).getAllByRole('listitem')).toHaveLength(7);
    expect(
      within(excludedSection).getByRole('button', { name: '접기', expanded: true }),
    ).toBeTruthy();
  });
});
