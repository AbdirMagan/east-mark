import { Router } from 'express';
import { z } from 'zod';

import { readLimiter } from '../middleware/rateLimit.js';
import { validateParams, validateQuery, validatedQuery } from '../middleware/validate.js';
import * as locations from '../services/locations.service.js';
import { ok } from '../utils/response.js';
import { booleanFlag, languageCode, latitude, longitude, refId } from '../validators/common.js';

export const locationsRouter: Router = Router();

locationsRouter.use(readLimiter);

const langQuery = z.object({ lang: languageCode.default('en') });

/**
 * Reference data is immutable between admin edits, so it is safe for clients
 * and any CDN in front of the API to hold it. The apps also persist it for
 * offline use (spec section 49).
 */
const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

locationsRouter.get('/countries', validateQuery(langQuery), async (req, res) => {
  const { lang } = validatedQuery<z.infer<typeof langQuery>>(req);
  const data = await locations.listCountries(lang);
  res.setHeader('Cache-Control', CACHE_CONTROL);
  ok(res, data);
});

const treeParams = z.object({ code: z.string().trim().length(2) });

/** The whole hierarchy for one country, for offline location pickers. */
locationsRouter.get(
  '/countries/:code/tree',
  validateParams(treeParams),
  validateQuery(langQuery),
  async (req, res) => {
    const { lang } = validatedQuery<z.infer<typeof langQuery>>(req);
    const data = await locations.countryTree(req.params.code as string, lang);
    res.setHeader('Cache-Control', CACHE_CONTROL);
    ok(res, data);
  },
);

locationsRouter.get(
  '/countries/:id/regions',
  validateParams(z.object({ id: refId })),
  validateQuery(langQuery),
  async (req, res) => {
    const { lang } = validatedQuery<z.infer<typeof langQuery>>(req);
    const data = await locations.listRegions(Number(req.params.id), lang);
    res.setHeader('Cache-Control', CACHE_CONTROL);
    ok(res, data);
  },
);

const citiesQuery = z.object({
  lang: languageCode.default('en'),
  countryId: refId.optional(),
  regionId: refId.optional(),
  major: booleanFlag,
  q: z.string().trim().min(1).max(60).optional(),
});

locationsRouter.get('/cities', validateQuery(citiesQuery), async (req, res) => {
  const query = validatedQuery<z.infer<typeof citiesQuery>>(req);
  const data = await locations.listCities(
    {
      countryId: query.countryId,
      regionId: query.regionId,
      majorOnly: query.major,
      query: query.q,
    },
    query.lang,
  );
  // A free-text lookup is per-user; only the browsable lists are cacheable.
  if (!query.q) res.setHeader('Cache-Control', CACHE_CONTROL);
  ok(res, data);
});

locationsRouter.get(
  '/cities/:id/districts',
  validateParams(z.object({ id: refId })),
  validateQuery(langQuery),
  async (req, res) => {
    const { lang } = validatedQuery<z.infer<typeof langQuery>>(req);
    const data = await locations.listDistricts(Number(req.params.id), lang);
    res.setHeader('Cache-Control', CACHE_CONTROL);
    ok(res, data);
  },
);

locationsRouter.get(
  '/districts/:id/neighborhoods',
  validateParams(z.object({ id: refId })),
  validateQuery(langQuery),
  async (req, res) => {
    const { lang } = validatedQuery<z.infer<typeof langQuery>>(req);
    const data = await locations.listNeighborhoods(Number(req.params.id), lang);
    res.setHeader('Cache-Control', CACHE_CONTROL);
    ok(res, data);
  },
);

const nearestQuery = z.object({
  lat: latitude,
  lng: longitude,
  lang: languageCode.default('en'),
});

/** Resolves a GPS fix to the nearest seeded city. */
locationsRouter.get('/nearest', validateQuery(nearestQuery), async (req, res) => {
  const { lat, lng, lang } = validatedQuery<z.infer<typeof nearestQuery>>(req);
  const data = await locations.nearestCity(lat, lng, lang);
  ok(res, data, data ? 'Success' : 'No city found near that location');
});
