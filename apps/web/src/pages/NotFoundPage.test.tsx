import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '../App.js';

afterEach(cleanup);

describe('NotFoundPage', () => {
  it('shows the 404 design and its navigation targets', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없어요' })).toBeTruthy();
    expect(screen.getByText('404')).toBeTruthy();
    expect(screen.getByRole('link', { name: '장소 목록으로' }).getAttribute('href')).toBe(
      '/#spots',
    );
    expect(screen.getByRole('link', { name: '홈으로' }).getAttribute('href')).toBe('/');
  });
});
