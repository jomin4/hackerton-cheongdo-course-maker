import { describe, expect, it } from 'vitest';
import request from 'supertest';
import pino from 'pino';

import { createApp } from '../../src/app.js';
import { createInMemoryRepository } from '../../src/data/spot-repository.js';
import type { Spot } from '@cheongdo/shared';
import { fixtureSpots } from '../fixtures/spots.js';

const app = createApp({
  spots: createInMemoryRepository(fixtureSpots),
  version: 'test',
  logger: pino({ level: 'silent' }),
});

describe('GET /api/spots', () => {
  it('returns spot summaries and total count', async () => {
    const response = await request(app).get('/api/spots').expect(200);
    const item = response.body.items[0];

    expect(response.body.total).toBe(11);
    expect(response.body.items).toHaveLength(11);
    expect(item).toMatchObject({
      kind: expect.any(String),
      location: { lat: expect.any(Number), lng: expect.any(Number) },
    });
    expect(item).not.toHaveProperty('image');
    expect(response.headers['cache-control']).toBe('public, max-age=300');
  });

  it('filters by kind in file order', async () => {
    const response = await request(app).get('/api/spots?kind=cafe').expect(200);

    expect(response.body.items.map(({ id }: { id: string }) => id)).toEqual(['c-near', 'c-far']);
  });

  it('combines kind and tag filters with AND', async () => {
    const response = await request(app).get('/api/spots?kind=restaurant&tag=nature').expect(200);

    expect(response.body.total).toBe(0);
    expect(response.body.items).toEqual([]);
  });

  it('rejects an invalid kind', async () => {
    const response = await request(app).get('/api/spots?kind=bar').expect(400);

    expect(response.body.error.code).toBe('INVALID_QUERY');
    expect(response.body.error.message).toBe('종류는 spot, restaurant, cafe 중 하나여야 해요.');
  });

  it('accepts each supported zone, including gakbuk-myeon', async () => {
    const response = await request(app).get('/api/spots?zone=gakbuk-myeon').expect(200);

    expect(response.body.total).toBe(0);
    expect(response.body.items).toEqual([]);
  });

  it('rejects an unsupported zone', async () => {
    const response = await request(app).get('/api/spots?zone=seoul').expect(400);

    expect(response.body.error.message).toBe('권역 값이 올바르지 않아요.');
  });

  it('includes the first image as the summary image when available', async () => {
    const image = {
      url: 'https://example.com/forest.jpg',
      alt: '숲길',
      license: 'kogl-1' as const,
      credit: '테스트 출처',
    };
    const spotsWithImage: Spot[] = fixtureSpots.map((spot) =>
      spot.id === 's-forest' ? { ...spot, images: [image] } : spot,
    );
    const appWithImage = createApp({
      spots: createInMemoryRepository(spotsWithImage),
      version: 'test',
      logger: pino({ level: 'silent' }),
    });
    const response = await request(appWithImage).get('/api/spots').expect(200);
    const forest = response.body.items.find(({ id }: { id: string }) => id === 's-forest');

    expect(forest.image).toEqual(image);
  });
});

describe('GET /api/spots/:id', () => {
  it('returns nearby tourist spots in increasing distance order', async () => {
    const response = await request(app).get('/api/spots/s-forest').expect(200);

    expect(response.body.spot.id).toBe('s-forest');
    expect(response.body.nearby.map(({ id }: { id: string }) => id)).toEqual([
      's-luge',
      's-museum',
      's-temple',
    ]);
    expect(response.body.nearby).toHaveLength(3);
    expect(response.headers['cache-control']).toBe('public, max-age=300');
  });

  it('shows nearby tourist spots for a cafe and excludes other kinds', async () => {
    const response = await request(app).get('/api/spots/c-far').expect(200);

    expect(response.body.nearby[0].id).toBe('s-lights');
    expect(response.body.nearby).toHaveLength(3);
    expect(response.body.nearby.every(({ kind }: { kind: string }) => kind === 'spot')).toBe(true);
  });

  it('returns a localized not found error for an unknown spot', async () => {
    const response = await request(app).get('/api/spots/nope').expect(404);

    expect(response.body.error.code).toBe('SPOT_NOT_FOUND');
    expect(response.body.error.message).toBe('장소를 찾을 수 없어요.');
  });
});

describe('unknown API paths', () => {
  it('returns NOT_FOUND', async () => {
    const response = await request(app).get('/api/nope').expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
