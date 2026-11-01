import { Router } from 'express';
import { spotsQuerySchema } from '@cheongdo/shared';

import type { SpotRepository } from '../data/spot-repository.js';
import { haversineKm } from '../domain/travel.js';
import { toSpotSummary } from '../domain/spot-summary.js';
import { HttpError } from '../lib/http-error.js';

function compareIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function createSpotsRouter(spots: SpotRepository): Router {
  const router = Router();

  router.get('/', (request, response) => {
    const query = spotsQuerySchema.parse(request.query);
    const results = spots
      .findAll()
      .filter((spot) => query.tag === undefined || spot.tags.includes(query.tag))
      .filter((spot) => query.zone === undefined || spot.zone === query.zone)
      .filter((spot) => query.kind === undefined || spot.kind === query.kind);
    const items = results.map(toSpotSummary);

    response.setHeader('Cache-Control', 'public, max-age=300');
    response.json({ items, total: items.length });
  });

  router.get('/:id', (request, response) => {
    const spot = spots.findById(request.params.id);
    if (!spot) {
      throw new HttpError(404, 'SPOT_NOT_FOUND', '장소를 찾을 수 없어요.');
    }

    const nearby = spots
      .findAll()
      .filter((candidate) => candidate.kind === 'spot' && candidate.id !== spot.id)
      .sort(
        (left, right) =>
          haversineKm(spot.location, left.location) - haversineKm(spot.location, right.location) ||
          compareIds(left.id, right.id),
      )
      .slice(0, 3)
      .map(toSpotSummary);

    response.setHeader('Cache-Control', 'public, max-age=300');
    response.json({ spot, nearby });
  });

  return router;
}
