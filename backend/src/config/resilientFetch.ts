import { logger } from './logger.js';

/**
 * A fetch wrapper with a timeout and bounded retries, used by every Supabase
 * client in this service.
 *
 * This is not theoretical. During the first end-to-end run of this API the
 * connection to Supabase failed with a bare ETIMEDOUT part-way through a
 * request, and without a retry that surfaced to the caller as a 500 on an
 * otherwise healthy system. The same class of blip is routine on the links
 * this marketplace targets.
 *
 * WHAT IS AND IS NOT RETRIED
 *
 * Only connection-level failures and 429/5xx responses are retried, and only
 * for requests that are safe to repeat.
 *
 * "Safe to repeat" means GET and HEAD. A POST that times out may have been
 * applied by the server before the connection dropped, so replaying it could
 * create two listings, two messages or two payments from one user action.
 * Losing a request is recoverable; silently duplicating one is not, and a
 * duplicated payment is not something a user forgives. Writes therefore fail
 * fast and the caller decides.
 *
 * Read-only RPCs are dispatched with { get: true } at the call site so they
 * travel as GET and qualify. See products.service.ts.
 */

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 250;

/** Node surfaces connection problems through these codes. */
const RETRYABLE_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
]);

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as { name?: string; code?: string; cause?: unknown; errors?: unknown[] };

  if (err.code && RETRYABLE_CODES.has(err.code)) return true;

  // Node wraps connection failures: TypeError: fetch failed -> cause -> code.
  if (err.cause) return isRetryableError(err.cause);

  // Happy-eyeballs failures arrive as AggregateError with one entry per address.
  if (Array.isArray(err.errors)) {
    return err.errors.some((inner) => isRetryableError(inner));
  }

  return false;
}

function isSafeToRepeat(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === 'GET' || upper === 'HEAD';
}

function backoffMs(attempt: number): number {
  // Exponential, with jitter so concurrent failures do not retry in lockstep.
  const exponential = BASE_BACKOFF_MS * 2 ** (attempt - 1);
  return exponential + Math.floor(Math.random() * BASE_BACKOFF_MS);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createResilientFetch(timeoutMs = DEFAULT_TIMEOUT_MS): typeof fetch {
  return async function resilientFetch(input, init) {
    const method = init?.method ?? 'GET';
    const repeatable = isSafeToRepeat(method);
    const attempts = repeatable ? MAX_ATTEMPTS : 1;

    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Respect a caller-supplied signal as well as our own timeout.
      const callerSignal = init?.signal;
      const onCallerAbort = () => controller.abort();
      callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

      try {
        const response = await fetch(input, { ...init, signal: controller.signal });

        // 429 and 5xx are worth one more try on a read; 4xx is the caller's
        // problem and retrying it only wastes their time.
        if (repeatable && attempt < attempts && (response.status === 429 || response.status >= 500)) {
          const wait = backoffMs(attempt);
          logger.warn(
            { attempt, status: response.status, waitMs: wait },
            'Upstream returned a retryable status; retrying',
          );
          await sleep(wait);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;

        // An abort triggered by the caller is intentional, not a failure to retry.
        if (callerSignal?.aborted) throw error;

        const retryable = repeatable && attempt < attempts && isRetryableError(error);
        if (!retryable) {
          if (!repeatable && isRetryableError(error)) {
            logger.warn(
              { method },
              'Connection failed on a non-repeatable request; not retrying to avoid duplicate writes',
            );
          }
          throw error;
        }

        const wait = backoffMs(attempt);
        logger.warn({ attempt, waitMs: wait, err: error }, 'Connection to Supabase failed; retrying');
        await sleep(wait);
      } finally {
        clearTimeout(timer);
        callerSignal?.removeEventListener('abort', onCallerAbort);
      }
    }

    throw lastError;
  } as typeof fetch;
}
