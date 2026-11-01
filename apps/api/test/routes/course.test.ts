import { describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';

import { createApp } from '../../src/app.js';
import { createInMemoryRepository } from '../../src/data/spot-repository.js';
import { fixtureSpots } from '../fixtures/spots.js';

const app = createApp({
  spots: createInMemoryRepository(fixtureSpots),
  version: 'test',
  logger: pino({ level: 'silent' }),
});

describe('GET /api/course', () => {
  it('returns a day plan and cache header', async () => {
    const response = await request(app)
      .get('/api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature,experience')
      .expect(200);

    expect(response.body.items.map(({ spot }: { spot: { id: string } }) => spot.id)).toEqual([
      's-temple',
      's-forest',
      'r-allday',
      'c-near',
      's-luge',
      's-museum',
      's-tunnel',
      'r-break',
    ]);
    expect(response.body.items.map(({ type }: { type: string }) => type)).toEqual([
      'visit',
      'visit',
      'meal',
      'rest',
      'visit',
      'visit',
      'visit',
      'meal',
    ]);
    expect(response.body.conditions.weekday).toBe('sat');
    expect(
      response.body.excluded.map(({ spot, reason }: { spot: { id: string }; reason: string }) => [
        spot.id,
        reason,
      ]),
    ).toEqual([['s-lights', 'NOT_ENOUGH_TIME']]);
    expect(response.headers['cache-control']).toBe('public, max-age=300');
  });

  it('normalizes tag order in the result', async () => {
    const response = await request(app)
      .get('/api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=experience,nature')
      .expect(200);

    expect(response.body.conditions.tags).toEqual(['nature', 'experience']);
  });

  it('rejects a v1 query with the missing-date error', async () => {
    const response = await request(app)
      .get('/api/course?hours=4&with=family&tags=nature')
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_QUERY');
    expect(response.body.error.message).toBe('방문 날짜가 올바르지 않아요.');
    expect(response.body.error.details[0].field).toBe('date');
  });

  it('rejects an impossible calendar date', async () => {
    const response = await request(app)
      .get('/api/course?date=2026-02-30&start=10:00&end=19:00&with=family&tags=nature')
      .expect(400);

    expect(response.body.error.message).toBe('방문 날짜가 올바르지 않아요.');
  });

  it('rejects a start time outside the allowed interval', async () => {
    const response = await request(app)
      .get('/api/course?date=2026-11-07&start=07:30&end=19:00&with=family&tags=nature')
      .expect(400);

    expect(response.body.error.message).toBe(
      '시작 시각은 08:00~14:00 사이 30분 단위로 골라주세요.',
    );
  });

  it('rejects an end time less than three hours after start', async () => {
    const response = await request(app)
      .get('/api/course?date=2026-11-07&start=10:00&end=12:30&with=family&tags=nature')
      .expect(400);

    expect(response.body.error.message).toBe(
      '끝 시각은 시작보다 3시간 이상 늦고 21:00 이전이어야 해요.',
    );
    expect(response.body.error.details.map(({ field }: { field: string }) => field)).toContain(
      'end',
    );
  });

  it('rejects repeated exclude query parameters', async () => {
    const response = await request(app)
      .get(
        '/api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature&exclude=s-forest&exclude=s-luge',
      )
      .expect(400);

    expect(response.body.error.message).toBe('제외할 장소 값이 올바르지 않아요.');
  });

  it('reports all invalid query fields using the first issue message', async () => {
    const response = await request(app)
      .get('/api/course?date=2026-02-30&start=10:00&end=19:00&with=alien&tags=unknown')
      .expect(400);

    expect(response.body.error.message).toBe('방문 날짜가 올바르지 않아요.');
    expect(response.body.error.details.map(({ field }: { field: string }) => field)).toEqual(
      expect.arrayContaining(['date', 'with', 'tags.0']),
    );
  });

  it('keeps unknown excluded IDs in the conditions', async () => {
    const response = await request(app)
      .get('/api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature&exclude=nope')
      .expect(200);

    expect(response.body.conditions.exclude).toEqual(['nope']);
  });

  it('allows a day plan with every tourist spot excluded', async () => {
    const response = await request(app)
      .get(
        '/api/course?date=2026-11-07&start=10:00&end=19:00&with=family&tags=nature&exclude=s-forest,s-luge,s-museum,s-temple,s-lights,s-tunnel',
      )
      .expect(200);

    expect(response.body.items.map(({ type }: { type: string }) => type)).not.toContain('visit');
    expect(response.body.excluded).toEqual([]);
  });
});
