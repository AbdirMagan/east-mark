import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { httpLogger, requestId } from './middleware/requestContext.js';
import { apiRouter, healthRouter } from './routes/index.js';
import { ForbiddenError } from './utils/errors.js';

export function createApp(): Express {
  const app = express();

  // Behind a load balancer or Supabase/Vercel edge, the client IP is in
  // X-Forwarded-For. Without this, rate limiting keys every request to the
  // proxy's address and one busy user throttles everyone.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(httpLogger);

  app.use(
    helmet({
      // This is a JSON API; it serves no HTML and embeds nothing.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header: native apps, curl, server-to-server. Not a browser,
        // so the same-origin policy CORS exists to relax does not apply.
        if (!origin) {
          callback(null, true);
          return;
        }
        if (env.CORS_ORIGINS.includes(origin) || env.CORS_ORIGINS.includes('*')) {
          callback(null, true);
          return;
        }
        callback(new ForbiddenError('This origin is not allowed'));
      },
      credentials: true,
      maxAge: 86_400,
    }),
  );

  app.use(compression());

  // 1 MB is generous for JSON: images go straight to storage via signed URLs
  // and never pass through here.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use(healthRouter);
  app.use(globalLimiter);
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
