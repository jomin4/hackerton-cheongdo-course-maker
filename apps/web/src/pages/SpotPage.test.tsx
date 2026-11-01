import type { DayPlan, Spot, SpotSummary, WeeklyHours } from '@cheongdo/shared';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SpotPage } from './SpotPage.js';
import { ApiError, fetchJson } from '../lib/api.js';

vi.mock('../lib/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api.js')>();
  return { ...actual, fetchJson: vi.fn() };
});

const hours: WeeklyHours = {
  days: {
    mon: [],
    tue: [{ open: '09:00', close: '18:00' }],
    wed: [{ open: '09:00', close: '18:00' }],
    thu: [{ open: '09:00', close: '18:00' }],
    fri: [{ open: '09:00', close: '18:00' }],
    sat: [{ open: '09:00', close: '18:00' }],
    sun: [{ open: '09:00', close: '18:00' }],
  },
  lastEntryBeforeCloseMinutes: 30,
  note: '1월 1일 휴관',
};

function makeSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    id: 'cheongdo-fortress',
    kind: 'spot',
    name: '청도읍성',
    summary: '청도의 역사를 살펴볼 수 있는 장소예요.',
    description: ['읍성의 모습을 둘러볼 수 있어요.'],
    tips: [],
    zone: 'cheongdo-eup',
    location: { lat: 35.6508, lng: 128.7066 },
    tags: ['history'],
    goodFor: ['family'],
    stayMinutes: 60,
    address: '경상북도 청도군',
    hours,
    images: [],
    source: '한국관광공사',
    checkedAt: '2026-10-31',
    ...overrides,
  };
}

function makeSummary(id: string, name: string, kind: SpotSummary['kind']): SpotSummary {
  return {
    id,
    kind,
    name,
    summary: `${name}을(를) 둘러볼 수 있어요.`,
    zone: 'cheongdo-eup',
    tags: kind === 'spot' ? ['history'] : [],
    stayMinutes: 40,
    location: { lat: 35.65, lng: 128.73 },
  };
}

const dayPlan: DayPlan = {
  conditions: {
    date: '2026-10-31',
    weekday: 'sat',
    start: '10:00',
    end: '19:00',
    with: 'family',
    tags: ['history'],
    exclude: [],
  },
  items: [
    {
      order: 1,
      type: 'visit',
      spot: makeSummary('first', '첫 장소', 'spot'),
      travelMinutes: 0,
      waitMinutes: 0,
      distanceKm: 0,
      arriveAt: '10:00',
      leaveAt: '10:30',
      matchedTags: ['history'],
      score: 15,
    },
    {
      order: 2,
      type: 'visit',
      spot: makeSummary('second', '이전 장소', 'restaurant'),
      travelMinutes: 5,
      waitMinutes: 0,
      distanceKm: 1,
      arriveAt: '10:35',
      leaveAt: '11:00',
      matchedTags: [],
      score: 0,
    },
    {
      order: 3,
      type: 'visit',
      spot: makeSummary('cheongdo-fortress', '청도읍성', 'spot'),
      travelMinutes: 8,
      waitMinutes: 0,
      distanceKm: 2,
      arriveAt: '11:08',
      leaveAt: '12:08',
      matchedTags: ['history'],
      score: 15,
    },
    {
      order: 4,
      type: 'meal',
      meal: 'lunch',
      spot: makeSummary('next', '다음 장소', 'cafe'),
      travelMinutes: 12,
      waitMinutes: 0,
      distanceKm: 3,
      arriveAt: '12:20',
      leaveAt: '13:00',
      matchedTags: [],
      score: 0,
    },
    {
      order: 5,
      type: 'visit',
      spot: makeSummary('fifth', '다섯째 장소', 'spot'),
      travelMinutes: 10,
      waitMinutes: 0,
      distanceKm: 2,
      arriveAt: '13:10',
      leaveAt: '14:00',
      matchedTags: ['history'],
      score: 15,
    },
    {
      order: 6,
      type: 'visit',
      spot: makeSummary('sixth', '여섯째 장소', 'spot'),
      travelMinutes: 15,
      waitMinutes: 0,
      distanceKm: 4,
      arriveAt: '14:15',
      leaveAt: '15:00',
      matchedTags: ['history'],
      score: 15,
    },
  ],
  excluded: [],
  totals: {
    visitCount: 4,
    stayMinutes: 270,
    travelMinutes: 50,
    startAt: '10:00',
    endAt: '15:00',
    slackMinutes: 190,
  },
  notices: [],
};

function renderSpot(spot: Spot, search = '', nearby: SpotSummary[] = [], plan: DayPlan = dayPlan) {
  vi.mocked(fetchJson).mockImplementation((path) =>
    Promise.resolve(path.startsWith('/api/spots/') ? { spot, nearby } : plan),
  );
  return render(
    <MemoryRouter initialEntries={[`/spots/${spot.id}${search}`]}>
      <Routes>
        <Route element={<SpotPage />} path="/spots/:id" />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SpotPage', () => {
  it('shows an image and credit when a licensed photo is available', async () => {
    renderSpot(
      makeSpot({
        images: [
          {
            url: 'https://example.com/cheongdo.jpg',
            alt: '청도읍성 전경',
            license: 'kogl-1',
            credit: 'ⓒ한국관광공사',
          },
        ],
      }),
    );

    const image = await screen.findByRole('img', { name: '청도읍성 전경' });
    expect(image.getAttribute('src')).toBe('https://example.com/cheongdo.jpg');
    expect(screen.getByText('ⓒ한국관광공사')).toBeTruthy();
  });

  it('keeps the existing illustration when there is no photo', async () => {
    const { container } = renderSpot(makeSpot());

    await screen.findByRole('heading', { name: '청도읍성' });
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('shows weekly hours, the note, source, and verified date', async () => {
    renderSpot(makeSpot());

    const information = await screen.findByRole('region', { name: '이용 정보' });
    expect(within(information).getByText('화~일 09:00–18:00')).toBeTruthy();
    expect(within(information).getByText('월 휴무')).toBeTruthy();
    expect(within(information).getByText('닫기 30분 전 입장 마감')).toBeTruthy();
    expect(within(information).getByText('안내')).toBeTruthy();
    expect(within(information).getByText('1월 1일 휴관')).toBeTruthy();
    expect(
      within(information).getByText('출처: 한국관광공사 · 2026-10-31 기준. 방문 전 확인하세요.'),
    ).toBeTruthy();
  });

  it('shows optional fee and a tappable phone link only when they are provided', async () => {
    renderSpot(makeSpot({ fee: '무료', phone: '054-123-4567' }));

    const information = await screen.findByRole('region', { name: '이용 정보' });
    expect(within(information).getByText('요금')).toBeTruthy();
    expect(within(information).getByText('무료')).toBeTruthy();
    const phone = within(information).getByRole('link', { name: '054-123-4567' });
    expect(phone.getAttribute('href')).toBe('tel:054-123-4567');
    expect(phone.className).toContain('min-h-11');

    cleanup();
    renderSpot(makeSpot());
    const noOptionalDetails = await screen.findByRole('region', { name: '이용 정보' });
    expect(within(noOptionalDetails).queryByText('요금')).toBeNull();
    expect(within(noOptionalDetails).queryByText('전화')).toBeNull();
  });

  it('links to the Kakao map using the place name and coordinates', async () => {
    renderSpot(makeSpot());

    const link = await screen.findByRole('link', { name: '지도에서 보기' });
    expect(link.getAttribute('href')).toBe(
      'https://map.kakao.com/link/map/%EC%B2%AD%EB%8F%84%EC%9D%8D%EC%84%B1,35.6508,128.7066',
    );
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('labels restaurants and displays their meal availability', async () => {
    renderSpot(makeSpot({ kind: 'restaurant', meals: ['lunch', 'dinner'], tags: [] }));

    expect(await screen.findByText('식당')).toBeTruthy();
    const information = screen.getByRole('region', { name: '이용 정보' });
    expect(within(information).getByText('식사')).toBeTruthy();
    expect(within(information).getByText('점심 · 저녁')).toBeTruthy();
  });

  it('labels cafes with the cafe kind', async () => {
    renderSpot(makeSpot({ kind: 'cafe', tags: [] }));

    expect(await screen.findByText('카페')).toBeTruthy();
  });

  it('shows the corresponding day-plan sequence when opened from a course', async () => {
    renderSpot(
      makeSpot(),
      '?from=date%3D2026-10-31%26start%3D10%253A00%26end%3D19%253A00%26with%3Dfamily%26tags%3Dhistory',
    );

    expect(await screen.findByText('하루 일정 3 / 6번째 · 11:08–12:08')).toBeTruthy();
    const previousLink = screen.getByRole('link', { name: /이전 장소/ });
    const nextLink = screen.getByRole('link', { name: /다음 장소/ });
    expect(previousLink.getAttribute('href')).toContain('/spots/second?from=');
    expect(nextLink.getAttribute('href')).toContain('/spots/next?from=');
    expect(within(nextLink).getByText('차로 약 12분')).toBeTruthy();
    expect(within(previousLink).getByText('식당')).toBeTruthy();
    expect(within(nextLink).getByText('카페')).toBeTruthy();
    expect(screen.getByRole('link', { name: '코스 전체 보기' }).getAttribute('href')).toBe(
      '/course?date=2026-10-31&start=10%3A00&end=19%3A00&with=family&tags=history',
    );
  });

  it('omits course context when this place is not in the day plan', async () => {
    const plan = {
      ...dayPlan,
      items: dayPlan.items.filter((item) => item.spot.id !== 'cheongdo-fortress'),
    };
    renderSpot(makeSpot(), '?from=date%3D2026-10-31', [], plan);

    await screen.findByRole('heading', { name: '청도읍성' });
    expect(screen.queryByRole('heading', { name: '이 코스에서' })).toBeNull();
  });

  it('shows nearby place photos and stay duration without estimating drive time', async () => {
    const nearby = makeSummary('nearby', '주변 장소', 'cafe');
    nearby.zone = 'hwayang-eup';
    nearby.image = {
      url: 'https://example.com/nearby.jpg',
      alt: '주변 장소 사진',
      license: 'kogl-1',
      credit: 'ⓒ한국관광공사',
    };
    renderSpot(makeSpot(), '', [nearby]);

    const card = await screen.findByRole('link', { name: /주변 장소/ });
    expect(screen.getByRole('heading', { name: '가까운 관광지' })).toBeTruthy();
    expect(within(card).getByText('화양읍')).toBeTruthy();
    expect(within(card).getByText('체류 40분')).toBeTruthy();
    expect(within(card).getByRole('img', { name: '주변 장소 사진' })).toBeTruthy();
    expect(within(card).getByText('ⓒ한국관광공사')).toBeTruthy();
    expect(within(card).queryByText(/차로 약/)).toBeNull();
  });

  it('shows the not-found message when the place does not exist', async () => {
    vi.mocked(fetchJson).mockRejectedValue(
      new ApiError(404, 'SPOT_NOT_FOUND', '해당 장소를 찾을 수 없어요.'),
    );
    render(
      <MemoryRouter initialEntries={['/spots/nope']}>
        <Routes>
          <Route element={<SpotPage />} path="/spots/:id" />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '찾는 장소가 없어요' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '장소 목록으로' }).getAttribute('href')).toBe(
      '/#spots',
    );
  });
});
