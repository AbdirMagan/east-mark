import { Router } from 'express';

import { env } from '../config/env.js';
import { anon } from '../config/supabase.js';
import { cacheStats } from '../utils/cache.js';
import { ok } from '../utils/response.js';
import { adminRouter } from './admin.routes.js';
import { categoriesRouter } from './categories.routes.js';
import { locationsRouter } from './locations.routes.js';
import { messagesRouter } from './messages.routes.js';
import { productsRouter } from './products.routes.js';
import { usersRouter } from './users.routes.js';

export const apiRouter: Router = Router();

apiRouter.use('/locations', locationsRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/messages', messagesRouter);
apiRouter.use('/admin', adminRouter);

/**
 * Public, client-readable configuration.
 *
 * Feature flags, image targets, listing limits and support contacts live in
 * app_settings rows flagged is_public, so any of them can be changed without
 * shipping a new build of four different clients. The apps fetch this at
 * startup and cache it.
 */
apiRouter.get('/config', async (_req, res) => {
  const [settings, languages, currencies] = await Promise.all([
    anon.from('app_settings').select('key, value').eq('is_public', true),
    anon.from('languages').select('code, name, native_name, is_rtl').eq('is_active', true).order('sort_order'),
    anon.from('currencies').select('code, name, symbol, decimal_digits').eq('is_active', true).order('sort_order'),
  ]);

  const config: Record<string, unknown> = {};
  for (const row of settings.data ?? []) {
    config[row.key] = row.value;
  }

  res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
  ok(res, {
    settings: config,
    languages: (languages.data ?? []).map((row) => ({
      code: row.code,
      name: row.name,
      nativeName: row.native_name,
      rtl: row.is_rtl,
    })),
    currencies: (currencies.data ?? []).map((row) => ({
      code: row.code,
      name: row.name,
      symbol: row.symbol,
      decimals: row.decimal_digits,
    })),
    deeplinkHost: env.DEEPLINK_HOST,
    siteUrl: env.SITE_URL,
  });
});

export const healthRouter: Router = Router();

/**
 * A signpost at the API root.
 *
 * Opening http://localhost:4000 in a browser is the first thing anyone does
 * after starting the server, and a bare "Route GET / not found" gives them
 * nothing to act on — least of all the fact that the marketplace itself is on
 * a different port. This says what this service is and where to go next.
 */
healthRouter.get('/', (_req, res) => {
  ok(
    res,
    {
      service: 'East-Market API',
      version: 'v1',
      status: 'running',
      // The thing most people opening this URL are actually looking for.
      webApp: 'http://localhost:5173',
      endpoints: {
        health: '/health',
        ready: '/health/ready',
        config: '/api/v1/config',
        locations: '/api/v1/locations/countries',
        categories: '/api/v1/categories',
        products: '/api/v1/products',
      },
    },
    'This is the East-Market API. The marketplace runs separately on port 5173.',
  );
});

/** Liveness: is the process up? Never touches the database. */
healthRouter.get('/health', (_req, res) => {
  ok(res, { status: 'ok', uptime: Math.round(process.uptime()), cache: cacheStats() });
});

/** Readiness: can we actually serve traffic? Checks the database. */
healthRouter.get('/health/ready', async (_req, res) => {
  const started = Date.now();
  const { error } = await anon.from('languages').select('code').limit(1);
  const latencyMs = Date.now() - started;

  if (error) {
    res.status(503).json({
      success: false,
      message: 'Database is unreachable',
      code: 'not_ready',
    });
    return;
  }

  ok(res, { status: 'ready', database: 'ok', latencyMs });
});
