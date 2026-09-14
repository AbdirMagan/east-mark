import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';

import type { FieldErrors } from '../utils/errors.js';
import { ValidationError } from '../utils/errors.js';

type Source = 'body' | 'query' | 'params';

/** Collapses a ZodError into the { field: [messages] } shape the API documents. */
export function toFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/**
 * Validates one part of the request and REPLACES it with the parsed result, so
 * handlers receive coerced, trimmed, defaulted values rather than raw strings.
 *
 * Express 5 exposes req.query as a getter, so it cannot be reassigned. The
 * parsed query is stashed on req.validatedQuery instead; use validated(req)
 * to read it.
 */
export function validate<T extends ZodTypeAny>(schema: T, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const input = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

    const result = schema.safeParse(input ?? {});
    if (!result.success) {
      next(new ValidationError(toFieldErrors(result.error)));
      return;
    }

    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'params') {
      Object.assign(req.params, result.data);
    } else {
      (req as RequestWithValidatedQuery).validatedQuery = result.data;
    }
    next();
  };
}

interface RequestWithValidatedQuery {
  validatedQuery?: unknown;
}

/** Reads the query object produced by validate(schema, 'query'). */
export function validatedQuery<T>(req: unknown): T {
  return (req as RequestWithValidatedQuery).validatedQuery as T;
}

export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validate(schema, 'body');
}

export function validateQuery<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validate(schema, 'query');
}

export function validateParams<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validate(schema, 'params');
}

export type Infer<T extends ZodTypeAny> = z.infer<T>;
