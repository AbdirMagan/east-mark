import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { logger } from '../config/logger.js';
import { isProduction } from '../config/env.js';
import { AppError, NotFoundError, isAppError } from '../utils/errors.js';
import type { ErrorBody } from '../utils/response.js';
import { toFieldErrors } from './validate.js';

/** Terminal 404 for unmatched routes. Mounted after every router. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
};

/**
 * The single place errors become responses.
 *
 * Two rules:
 *   1. A 5xx never shows the client what actually broke. Postgres messages
 *      carry column, constraint and sometimes row contents; a stack trace
 *      carries file paths. Both go to the log, indexed by request id, and the
 *      client gets the request id so support can join the two.
 *   2. Everything below 500 is a message the caller is meant to act on, so it
 *      is forwarded as written.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = normalise(err);
  const requestId = String(req.id);

  const logPayload = {
    err: error,
    requestId,
    method: req.method,
    path: req.originalUrl,
    status: error.status,
    userId: req.auth?.userId,
    // `cause` holds the original PostgrestError when fromPostgrest wrapped it.
    cause: error.cause,
  };

  if (error.status >= 500) {
    logger.error(logPayload, error.message);
  } else if (error.status === 401 || error.status === 403) {
    logger.warn(logPayload, error.message);
  } else {
    logger.info(logPayload, error.message);
  }

  if (res.headersSent) {
    return;
  }

  const body: ErrorBody = {
    success: false,
    message: error.expose ? error.message : 'Something went wrong on our side',
    code: error.code,
    requestId,
  };

  if (error.errors) {
    body.errors = error.errors;
  }

  // In development, surface the real cause so the loop is short.
  if (!isProduction && !error.expose) {
    (body as ErrorBody & { debug?: unknown }).debug = {
      message: error.message,
      cause: error.cause,
    };
  }

  res.status(error.status).json(body);
};

function normalise(err: unknown): AppError {
  if (isAppError(err)) return err;

  if (err instanceof ZodError) {
    return new AppError(422, 'Validation failed', {
      code: 'validation_failed',
      errors: toFieldErrors(err),
    });
  }

  // Body parser rejections arrive as plain errors carrying a status.
  const candidate = err as { status?: number; statusCode?: number; message?: string; type?: string };
  const status = candidate?.status ?? candidate?.statusCode;

  if (candidate?.type === 'entity.too.large') {
    return new AppError(413, 'That request body is too large', { code: 'payload_too_large' });
  }
  if (candidate?.type === 'entity.parse.failed') {
    return new AppError(400, 'Request body is not valid JSON', { code: 'invalid_json' });
  }
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new AppError(status, candidate.message ?? 'Bad request');
  }

  return new AppError(500, err instanceof Error ? err.message : 'Unexpected error', {
    expose: false,
    cause: err,
  });
}
