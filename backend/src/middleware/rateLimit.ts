import rateLimit, { type Options } from 'express-rate-limit';

import { env, isTest } from '../config/env.js';
import { TooManyRequestsError } from '../utils/errors.js';

/**
 * Signed-in callers are limited per account, anonymous ones per IP.
 *
 * Keying purely on IP would be wrong for the target markets: a large share of
 * East African mobile traffic is carrier-NATed, so thousands of real users can
 * share one address. Limiting by IP alone would throttle a whole network the
 * moment one person browsed quickly.
 */
function keyFor(req: { auth?: { userId: string }; ip?: string }): string {
  if (req.auth?.userId) return `user:${req.auth.userId}`;
  return `ip:${req.ip ?? 'unknown'}`;
}

function make(options: Partial<Options> & { windowMs: number; limit: number }) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keyFor,
    // The default IP-based validators do not understand the user-keyed scheme
    // above and only emit advisory warnings.
    validate: false,
    // Tests would otherwise trip limits while exercising handlers.
    skip: () => isTest,
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError());
    },
    ...options,
  });
}

/** Baseline for the whole API. */
export const globalLimiter = make({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** Reads are cheap; browsing a marketplace is meant to be fast. */
export const readLimiter = make({
  windowMs: 60_000,
  limit: 300,
});

/** Writes are rarer and more expensive. */
export const writeLimiter = make({
  windowMs: 60_000,
  limit: 40,
});

/**
 * Credential endpoints. Deliberately tight: this is the difference between a
 * password being guessable and not.
 */
export const authLimiter = make({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
});

/** Listing creation. Slows bulk spam without getting in a real seller's way. */
export const listingLimiter = make({
  windowMs: 60 * 60_000,
  limit: 30,
});

/** Messaging. High enough for a real conversation, low enough to blunt blasts. */
export const messageLimiter = make({
  windowMs: 60_000,
  limit: 60,
});

/** Reports and other abuse-prone submissions. */
export const reportLimiter = make({
  windowMs: 60 * 60_000,
  limit: 20,
});
