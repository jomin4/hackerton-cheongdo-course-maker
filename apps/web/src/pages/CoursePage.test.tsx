import type { DayPlan, SpotSummary } from '@cheongdo/shared';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CoursePage } from './CoursePage.js';

const conditions: DayPlan['conditions'] = {
  date: '2026-11-07',
  weekday: 'sat',
  start: '10:00',
  end: '19:00',
  with: 'family',
  tags: ['nature', 'experience'],
  exclude: [],
};

function testSpot(
  id: string,
  name: string,
  kind: SpotSummary['kind'] = 'spot',
  image?: SpotSummary['image'],
): SpotSummary {
  return {
    id,
    kind,
    name,
    summary: `${name}을(를) 둘러볼 수 있어요.`,
    zone: 'cheongdo-eup',
    tags: kind === 'spot' ? ['nature'] : [],
    stayMinutes: 40,
    location: { lat: 35.65, lng: 128.73 },
    ...(image ? { image } : {}),
  };
}

const dayPlan: DayPlan = {
  conditions,
  items: [
    {
      order: 1,
      type: 'visit',
      spot: testSpot('s-a', '첫 관광지', 'spot', {
        url: 'https://example.com/photo.jpg',
        alt: '테스트 사진',
        license: 'kogl-1',
        credit: 'ⓒ한국관광공사',
      }),
      travelMinutes: 0,
      waitMinutes: 0,
      distanceKm: 0,
      arriveAt: '10:00',
      leaveAt: '10:40',
      matchedTags: ['nature'],
      score: 15,
    },
    {
      order: 2,
      type: 'visit',
      spot: testSpot('s-b', '둘째 관광지'),
      travelMinutes: 12,
      waitMinutes: 0,
      distanceKm: 6.3,
      arriveAt: '10:50',
      leaveAt: '11:50',
      matchedTags: ['nature', 'experience'],
      score: 25,
    },
    {
      order: 3,
      type: 'meal',
      meal: 'lunch',
      spot: testSpot('r-a', '점심 식당', 'restaurant'),
      travelMinutes: 5,
      waitMinutes: 0,
      distanceKm: 1.2,
      arriveAt: '12:00',
      leaveAt: '13:00',
      matchedTags: [],
      score: 0,
    },
    {
      order: 4,
      type: 'rest',
      spot: testSpot('c-a', '쉬어 가는 카페', 'cafe'),
      travelMinutes: 3,
      waitMinutes: 0,
      distanceKm: 0.8,
      arriveAt: '13:10',
      leaveAt: '13:40',
      matchedTags: [],
      score: 0,
    },
    {
      order: 5,
      type: 'visit',
      spot: testSpot('s-c', '셋째 관광지'),
      travelMinutes: 10,
      waitMinutes: 15,
      distanceKm: 2.1,
      arriveAt: '14:00',
      leaveAt: '15:00',
      matchedTags: ['experience'],
      score: 15,
    },
    {
      order: 6,
      type: 'meal',
      meal: 'dinner',
      spot: testSpot('r-b', '저녁 식당', 'restaurant'),
      travelMinutes: 8,
      waitMinutes: 0,
      distanceKm: 2.4,
      arriveAt: '17:40',
      leaveAt: '18:40',
      matchedTags: [],
      score: 0,
    },
  ],
  excluded: [
    { spot: testSpot('s-d', '휴무 장소'), reason: 'CLOSED_ON_DAY' },
    { spot: testSpot('s-e', '시간 부족 장소'), reason: 'NOT_ENOUGH_TIME' },
  ],
  totals: {
    visitCount: 3,
    stayMinutes: 300,
    travelMinutes: 38,
    startAt: '10:00',
    endAt: '18:40',
    slackMinutes: 82,
  },
  notices: ['이 시간에 영업하는 카페를 찾지 못했어요'],
};

function renderCourse(
  plan: DayPlan,
  search = '?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience',
) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(plan), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const view = render(
    <MemoryRouter initialEntries={[`/course${search}`]}>
      <Routes>
        <Route element={<CoursePage />} path="/course" />
      </Routes>
    </MemoryRouter>,
  );
  return { ...view, fetchMock };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CoursePage', () => {
  it('renders a dated day plan with timeline, notices, and exclusions', async () => {
    const { fetchMock } = renderCourse(dayPlan);

    expect(
      await screen.findByRole('heading', { name: '11월 7일(토) 가족과 함께하는 청도 하루' }),
    ).toBeTruthy();
    expect(screen.getByText('10:00–19:00')).toBeTruthy();
    expect(screen.getByText('11월 7일(토)')).toBeTruthy();
    expect(screen.getByText('10:00–10:40')).toBeTruthy();
    for (const label of ['관광', '점심', '쉬어 가기', '저녁']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getByText('차로 약 12분 · 6.3km')).toBeTruthy();
    expect(screen.getByText('차로 약 10분 · 2.1km · 여유 15분')).toBeTruthy();
    expect(screen.getByText('이 시간에 영업하는 카페를 찾지 못했어요')).toBeTruthy();
    expect(screen.getByText('이날 휴무')).toBeTruthy();
    expect(screen.getByText('시간 부족')).toBeTruthy();
    expect(screen.getByText('관광 3곳')).toBeTruthy();
    expect(screen.getByText('식사 2번')).toBeTruthy();

    const orderedSections = [
      screen.getByRole('region', { name: '일정 요약' }),
      screen.getByRole('status', { name: '일정 안내' }),
      screen.getByRole('region', { name: '방문 순서' }),
      screen.getByRole('region', { name: '이번 일정에서 빠진 장소' }),
      screen.getByText(/이동 시간은 직선거리에 도로 보정을 더해 어림한 값이에요/),
    ];
    for (let index = 0; index < orderedSections.length - 1; index += 1) {
      expect(
        orderedSections[index]!.compareDocumentPosition(orderedSections[index + 1]!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    const image = screen.getByRole('img', { name: '테스트 사진' });
    expect(image.getAttribute('src')).toBe('https://example.com/photo.jpg');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['h-44', 'sm:h-56', 'object-cover']),
    );
    expect(screen.getByText('ⓒ한국관광공사')).toBeTruthy();
    expect(screen.getAllByRole('img', { name: /테스트 사진/ })).toHaveLength(1);
    for (const name of ['둘째 관광지', '점심 식당', '쉬어 가는 카페', '셋째 관광지']) {
      const card = screen.getByRole('heading', { name, level: 3 }).closest('article');
      expect(card?.querySelector('img')).toBeNull();
    }

    const timeline = screen.getByRole('region', { name: '방문 순서' });
    const listItems = within(timeline).getAllByRole('listitem');
    expect(listItems).toHaveLength(6);
    expect(
      screen
        .getByRole('link', { name: '끝 시각을 21:00으로 늦춰 다시 만들기' })
        .getAttribute('href'),
    ).toBe('/course?date=2026-11-07&start=10:00&end=21:00&with=family&tags=nature,experience');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('shows the first item waiting time before its card', async () => {
    const plan = {
      ...dayPlan,
      items: dayPlan.items.map((item, index) =>
        index === 0 ? { ...item, waitMinutes: 60 } : item,
      ),
    };
    renderCourse(plan);

    expect(await screen.findByText('여는 시간까지 여유 1시간')).toBeTruthy();
  });

  it('offers to extend an empty day and keeps the selected conditions', async () => {
    const plan: DayPlan = {
      ...dayPlan,
      conditions: { ...conditions, end: '17:00' },
      items: [],
      excluded: [],
      totals: {
        visitCount: 0,
        stayMinutes: 0,
        travelMinutes: 0,
        startAt: '10:00',
        endAt: '10:00',
        slackMinutes: 420,
      },
    };
    renderCourse(plan, '?date=2026-11-07&start=10:00&end=17:00&with=family&tags=nature,experience');

    expect(
      await screen.findByRole('heading', { name: '조건에 맞는 장소를 찾지 못했어요' }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "10:00–17:00 안에 담을 수 있는 '자연, 체험' 장소가 없어요. 끝 시각을 늦추거나 관심사를 더 골라보세요.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: '끝 시각 늦추기' }).getAttribute('href')).toBe(
      '/course?date=2026-11-07&start=10:00&end=21:00&with=family&tags=nature,experience',
    );
    expect(screen.getByRole('link', { name: '관심사 더 고르기' }).getAttribute('href')).toBe(
      '/?date=2026-11-07&start=10:00&end=17:00&with=family&tags=nature,experience',
    );
  });

  it('does not offer to extend an empty day that already ends at 21:00', async () => {
    const plan: DayPlan = {
      ...dayPlan,
      conditions: { ...conditions, end: '21:00' },
      items: [],
      excluded: [],
      totals: {
        visitCount: 0,
        stayMinutes: 0,
        travelMinutes: 0,
        startAt: '10:00',
        endAt: '10:00',
        slackMinutes: 660,
      },
    };
    renderCourse(plan, '?date=2026-11-07&start=10:00&end=21:00&with=family&tags=nature,experience');

    await screen.findByRole('heading', { name: '조건에 맞는 장소를 찾지 못했어요' });
    expect(screen.queryByRole('link', { name: '끝 시각 늦추기' })).toBeNull();
  });

  it('shows an accessible loading skeleton while the request is pending', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    render(
      <MemoryRouter
        initialEntries={[
          '/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience',
        ]}
      >
        <Routes>
          <Route element={<CoursePage />} path="/course" />
        </Routes>
      </MemoryRouter>,
    );

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(within(status).getByText('코스를 계산하고 있어요')).toBeTruthy();
  });

  it('highlights only the invalid query value and returns to the same conditions', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'INVALID_QUERY',
              message: '시작 시각을 다시 확인해 주세요.',
              details: [{ field: 'start', value: '07:00', issue: 'outside range' }],
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    render(
      <MemoryRouter
        initialEntries={['/course?date=2026-11-07&start=07:00&end=19:00&with=family&tags=nature']}
      >
        <Routes>
          <Route element={<CoursePage />} path="/course" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('조건을 다시 확인해 주세요')).toBeTruthy();
    expect(screen.getByText('07:00').className).toContain('text-accent-text');
    expect(screen.getByText('family').className).not.toContain('text-accent-text');
    expect(
      screen.getByText(
        '방문 날짜(오늘 이후), 시작 08:00~14:00, 끝은 시작 3시간 뒤~21:00(30분 단위), 동행, 관심사를 확인해 주세요.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: '조건 다시 고르기' }).getAttribute('href')).toBe(
      '/?date=2026-11-07&start=07:00&end=19:00&with=family&tags=nature',
    );
  });

  it('retries a failed server request and renders the plan on success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: 'INTERNAL_ERROR', message: '잠시 후 다시 시도해 주세요.' },
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(dayPlan), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter
        initialEntries={[
          '/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience',
        ]}
      >
        <Routes>
          <Route element={<CoursePage />} path="/course" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '잠시 문제가 생겼어요' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(
      await screen.findByRole('heading', { name: '11월 7일(토) 가족과 함께하는 청도 하루' }),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows a retry action for network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(
      <MemoryRouter
        initialEntries={['/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature']}
      >
        <Routes>
          <Route element={<CoursePage />} path="/course" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '잠시 문제가 생겼어요' })).toBeTruthy();
    expect(screen.getByText('서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy();
  });

  it('shows the not-found state for a missing spot error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'SPOT_NOT_FOUND', message: '찾는 장소가 없어요.' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    render(
      <MemoryRouter
        initialEntries={['/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature']}
      >
        <Routes>
          <Route element={<CoursePage />} path="/course" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '찾는 장소가 없어요' })).toBeTruthy();
  });

  it('copies the current day plan URL', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderCourse(dayPlan);

    fireEvent.click(await screen.findByRole('button', { name: '링크 복사' }));
    expect(await screen.findByText('복사됨')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience`,
    );
  });
});
