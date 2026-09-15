import { Router } from 'express';
import { z } from 'zod';

import { readLimiter } from '../middleware/rateLimit.js';
import { validateParams, validateQuery, validatedQuery } from '../middleware/validate.js';
import * as ads from '../services/ads.service.js';
import { ok } from '../utils/response.js';
import { DEFAULT_LANGUAGE, idParam, languageCode } from '../validators/common.js';

export const adsRouter: Router = Router();

const listQuery = z.object({
  placement: z.enum(ads.AD_PLACEMENTS).default('home_hero'),
  lang: languageCode.default(DEFAULT_LANGUAGE),
  countryId: z.coerce.number().int().positive().optional(),
});

/** Running promotions for a placement, localized. Public. */
adsRouter.get('/', readLimiter, validateQuery(listQuery), async (req, res) => {
  const query = validatedQuery<z.infer<typeof listQuery>>(req);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  ok(res, await ads.listAds(query));
});

/** Counts a tap on a slide, for the click numbers staff see in the dashboard. */
adsRouter.post('/:id/click', readLimiter, validateParams(idParam), async (req, res) => {
  await ads.recordClick(req.params.id as string);
  ok(res, null, 'Recorded');
});
