import { Router } from 'express';
import { z } from 'zod';

import { readLimiter } from '../middleware/rateLimit.js';
import { validateParams, validateQuery, validatedQuery } from '../middleware/validate.js';
import * as categories from '../services/categories.service.js';
import { ok } from '../utils/response.js';
import { languageCode } from '../validators/common.js';

export const categoriesRouter: Router = Router();

categoriesRouter.use(readLimiter);

const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';
const langQuery = z.object({ lang: languageCode.default('en') });

/** Top-level categories with subcategories nested. The app-start request. */
categoriesRouter.get('/', validateQuery(langQuery), async (req, res) => {
  const { lang } = validatedQuery<z.infer<typeof langQuery>>(req);
  const data = await categories.categoryTree(lang);
  res.setHeader('Cache-Control', CACHE_CONTROL);
  ok(res, data);
});

/** Flat list, for filter dropdowns. */
categoriesRouter.get('/flat', validateQuery(langQuery), async (req, res) => {
  const { lang } = validatedQuery<z.infer<typeof langQuery>>(req);
  const data = await categories.listCategories(lang);
  res.setHeader('Cache-Control', CACHE_CONTROL);
  ok(res, data);
});

const slugParam = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Not a valid category'),
});

/** One category with its children and its listing field schema. */
categoriesRouter.get('/:slug', validateParams(slugParam), validateQuery(langQuery), async (req, res) => {
  const { lang } = validatedQuery<z.infer<typeof langQuery>>(req);
  const data = await categories.getCategoryBySlug(req.params.slug as string, lang);
  res.setHeader('Cache-Control', CACHE_CONTROL);
  ok(res, data);
});
