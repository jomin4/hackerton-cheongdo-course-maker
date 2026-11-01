import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SiteFooter } from './SiteFooter.js';

describe('SiteFooter', () => {
  it('shows data and photo attribution while retaining the operating-hours reminder', () => {
    render(<SiteFooter />);

    expect(screen.getByText('데이터 제공: ⓒ한국관광공사')).toBeTruthy();
    expect(screen.getByText('사진: 한국관광공사 (공공누리 제1유형)')).toBeTruthy();
    expect(screen.getByText('운영 정보는 방문 전 공식 안내를 확인해 주세요.')).toBeTruthy();
  });
});
