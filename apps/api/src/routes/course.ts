import { dayQuerySchema } from '@cheongdo/shared';
import { Router } from 'express';

import type { SpotRepository } from '../data/spot-repository.js';
import { planDay } from '../domain/plan-day.js';

export function createCourseRouter(spots: SpotRepository): Router {
  const router = Router();

  router.get('/', (request, response) => {
    const query = dayQuerySchema.parse(request.query);
    const dayPlan = planDay(spots.findAll(), query);

    response.setHeader('Cache-Control', 'public, max-age=300');
    response.json(dayPlan);
  });

  return router;
}
