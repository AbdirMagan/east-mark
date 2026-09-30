/**
 * Serverless entry point for Vercel.
 *
 * `src/server.ts` is the long-running version: it binds a port, handles SIGTERM
 * and shuts down cleanly. None of that applies on Vercel, where each request
 * arrives at a function that may be frozen the moment it replies. So this file
 * builds the same Express app and hands it over as a request handler instead.
 *
 * Two consequences of running this way are worth knowing:
 *
 *   - The rate limiter and the TTL cache hold their state in memory, which now
 *     means per instance rather than per deployment. Limits are therefore
 *     looser than they look, and a cached response may be recomputed more
 *     often. Neither is a correctness problem; both would need Redis (or
 *     Vercel KV) to behave exactly as they do on a single server.
 *   - There is no warm process between requests, so the first call after an
 *     idle period pays the cold start.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import { createApp } from '../src/app.js';

const app = createApp();

export default function handler(request: IncomingMessage, response: ServerResponse) {
  return app(request as never, response as never);
}
