import type { PostgrestError } from '@supabase/supabase-js';

/** Field-keyed validation details, matching the documented error envelope. */
export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors?: FieldErrors;
  /** True when the message is safe to show a user verbatim. */
  readonly expose: boolean;

  constructor(
    status: number,
    message: string,
    options: { code?: string; errors?: FieldErrors; expose?: boolean; cause?: unknown } = {},
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.status = status;
    this.code = options.code ?? defaultCodeForStatus(status);
    this.errors = options.errors;
    this.expose = options.expose ?? status < 500;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', errors?: FieldErrors) {
    super(400, message, { code: 'bad_request', errors });
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldErrors, message = 'Validation failed') {
    super(422, message, { code: 'validation_failed', errors });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, { code: 'unauthorized' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(403, message, { code: 'forbidden' });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, { code: 'not_found' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'That already exists') {
    super(409, message, { code: 'conflict' });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests. Please slow down.') {
    super(429, message, { code: 'rate_limited' });
  }
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 422:
      return 'validation_failed';
    case 429:
      return 'rate_limited';
    default:
      return status >= 500 ? 'internal_error' : 'error';
  }
}

/**
 * Translates a PostgREST error into an HTTP error.
 *
 * The important case is 42501 (insufficient_privilege). The schema leans on
 * row level security and column privileges, so "permission denied" is a normal,
 * expected outcome of a request that tried to touch something it should not —
 * not a server fault. Returning 500 for it would bury real authorisation bugs
 * in the noise of genuine outages.
 *
 * Postgres messages are never forwarded verbatim: they leak column and
 * constraint names. The original is attached as `cause` for the logs.
 */
export function fromPostgrest(error: PostgrestError, resource = 'Resource'): AppError {
  // Supabase refused the key itself (no Postgres code). In practice this is a
  // wrong or placeholder SUPABASE_SERVICE_ROLE_KEY: reads as the user still
  // work, so the only symptom is every moderation write failing. Say so, rather
  // than a generic 500 that sends someone hunting through the logs.
  if (/invalid api key/i.test(error.message ?? '')) {
    return new AppError(
      503,
      'The backend\'s Supabase key was rejected ("Invalid API key"). Put the real service_role (secret) key ' +
        'from Supabase: Settings -> API Keys into SUPABASE_SERVICE_ROLE_KEY in backend/.env, then restart the API.',
      { code: 'supabase_key_invalid', expose: true, cause: error },
    );
  }

  switch (error.code) {
    case 'PGRST116': // .single() matched no rows
    case 'P0002': // raise exception ... errcode 'P0002'
      return new NotFoundError(resource);

    case '42501': // insufficient_privilege — RLS or a column grant said no
      return new ForbiddenError('You do not have permission to do that');

    case '23505': // unique_violation
      return new ConflictError('That already exists');

    case '23503': // foreign_key_violation
      return new BadRequestError('That references something which does not exist');

    case '23514': // check_violation
      return new BadRequestError('Some of those values are not allowed');

    case '22023': // invalid_parameter_value — raised by our own RPCs
      return new AppError(400, error.message || 'Invalid request', {
        code: 'invalid_parameter',
        cause: error,
      });

    case '23502': // not_null_violation
      return new BadRequestError('A required value is missing');

    default:
      return new AppError(500, 'Something went wrong on our side', {
        code: 'database_error',
        expose: false,
        cause: error,
      });
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
