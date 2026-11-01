// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchJson } from '../lib/api.js';
import { HomePage } from './HomePage.js';

vi.mock('../lib/api.js', () => ({
  fetchJson: vi.fn().mockResolvedValue({ items: [] }),
}));

function renderHome(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<p>코스 결과</p>} path="/course" />
      </Routes>
      <LocationOutput />
    </MemoryRouter>,
  );
}

function LocationOutput() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

describe('HomePage', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-06T03:00:00Z'), toFake: ['Date'] });
    vi.clearAllMocks();
  });

  it('uses the Seoul date and offers start and end times for a full day', () => {
    renderHome();

    expect(screen.getByLabelText('방문 날짜').getAttribute('min')).toBe('2026-11-06');
    expect(screen.getByLabelText('시작').querySelectorAll('option')).toHaveLength(13);
    expect(screen.getByLabelText('끝').querySelector('option')?.value).toBe('13:00');
    expect(fetchJson).toHaveBeenCalledWith('/api/spots?kind=spot');
  });

  it('keeps the selected end time and updates the shared URL when it remains available', () => {
    renderHome();

    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '14:00' } });

    expect((screen.getByLabelText('끝') as HTMLSelectElement).value).toBe('19:00');
    expect(
      screen.getByText(
        '/course?date=2026-11-06&start=14:00&end=19:00&with=family&tags=nature,experience',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('끝').querySelector('option')?.value).toBe('17:00');
  });

  it('moves the end time to the first available option when the selected end is unavailable', () => {
    renderHome();

    fireEvent.change(screen.getByLabelText('끝'), { target: { value: '13:00' } });
    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '11:00' } });

    expect((screen.getByLabelText('끝') as HTMLSelectElement).value).toBe('14:00');
  });

  it('shows the selected date and correct defaults from search parameters', () => {
    renderHome('/?date=2026-11-07&with=solo&tags=photo,nature');

    expect(screen.getByText(/11월 7일\(토\).*10:00–19:00/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '혼자' }).getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByText('/course?date=2026-11-07&start=10:00&end=19:00&with=solo&tags=nature,photo'),
    ).toBeTruthy();
  });

  it('returns an empty or past date selection to today', () => {
    renderHome();
    const dateInput = screen.getByLabelText('방문 날짜');

    fireEvent.change(dateInput, { target: { value: '2026-10-31' } });

    expect((dateInput as HTMLInputElement).value).toBe('2026-11-06');

    fireEvent.change(dateInput, { target: { value: '' } });

    expect((dateInput as HTMLInputElement).value).toBe('2026-11-06');
  });

  it('disables course creation when every interest is cleared', () => {
    renderHome();

    for (const label of ['자연', '역사·문화', '체험', '먹거리', '사진 명소']) {
      const button = screen.getByRole('button', { name: label });
      if (button.getAttribute('aria-pressed') === 'true') fireEvent.click(button);
    }

    const conditions = screen.getByRole('region', { name: '여행 조건을 골라주세요' });
    expect(
      within(conditions).getByRole('button', { name: '코스 만들기' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByText('관심사를 하나 이상 골라주세요')).toBeTruthy();
  });

  it('navigates to the selected course URL', () => {
    renderHome();

    const conditions = screen.getByRole('region', { name: '여행 조건을 골라주세요' });
    fireEvent.click(within(conditions).getByRole('button', { name: '코스 만들기' }));

    expect(screen.getByTestId('location').textContent).toBe(
      '/course?date=2026-11-06&start=10:00&end=19:00&with=family&tags=nature,experience',
    );
  });
});
