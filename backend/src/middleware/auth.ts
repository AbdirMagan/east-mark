import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { admin, asUser, hasServiceRole } from '../config/supabase.js';
import type { AppRole, AuthContext } from '../types/express.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

const ISSUER = `${env.SUPABASE_URL}/auth/v1`;
const AUDIENCE = 'authenticated';

/** Cached remote key set. jose handles refresh and rotation internally. */
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

const hmacSecret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : null;

interface VerifiedToken {
  userId: string;
  email?: string;
}

/**
 * Verifies a Supabase access token.
 *
 * Local verification first, because a network round trip per request to
 * /auth/v1/user would put Supabase in the critical path of every single API
 * call. Supabase projects sign either with asymmetric keys (verified from
 * JWKS) or the legacy shared secret (HS256), so both are supported and the
 * token header decides which.
 *
 * If local verification is not possible — an HS256 token with no configured
 * secret, or JWKS unreachable — it falls back to asking Supabase directly.
 * Slower, but it means a misconfigured secret degrades performance instead of
 * locking every user out.
 */
async function verifyAccessToken(token: string): Promise<VerifiedToken> {
  let alg: string | undefined;
  try {
    alg = decodeProtectedHeader(token).alg;
  } catch {
    throw new UnauthorizedError('Malformed access token');
  }

  const usesSharedSecret = alg?.startsWith('HS') ?? false;

  if (!usesSharedSecret || hmacSecret) {
    try {
      const options = { issuer: ISSUER, audience: AUDIENCE };
      // Branch rather than pass a union: jwtVerify is overloaded on a raw key
      // versus a key-resolving function, and a union satisfies neither.
      const { payload } = usesSharedSecret
        ? await jwtVerify(token, hmacSecret!, options)
        : await jwtVerify(token, jwks, options);

      if (!payload.sub) {
        throw new UnauthorizedError('Access token is missing a subject');
      }
      return {
        userId: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
    } catch (error) {
      // An expired or tampered token is a 401, not a reason to retry remotely.
      if (isJoseClaimFailure(error)) {
        throw new UnauthorizedError('Your session has expired. Please sign in again.');
      }
      logger.warn({ err: error }, 'Local token verification failed; falling back to Supabase');
    }
  }

  // Remote fallback. Uses the service-role client only to validate the token;
  // it never reads data on the caller's behalf.
  if (!hasServiceRole) {
    // Without the key there is no second opinion to ask for, and treating an
    // unverifiable token as valid would be the worst possible failure mode.
    throw new UnauthorizedError('Could not verify your session. Please sign in again.');
  }

  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
  return { userId: data.user.id, email: data.user.email ?? undefined };
}

function isJoseClaimFailure(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  return (
    code === 'ERR_JWT_EXPIRED' ||
    code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' ||
    code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' ||
    code === 'ERR_JWS_INVALID'
  );
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, value] = header.split(' ');
  if (!value || scheme?.toLowerCase() !== 'bearer') return null;
  return value.trim() || null;
}

async function buildContext(token: string): Promise<AuthContext> {
  const { userId, email } = await verifyAccessToken(token);
  return { userId, email, token, db: asUser(token) };
}

/**
 * Attaches req.auth when a valid token is present, and does nothing when it is
 * absent. Used on public endpoints that behave differently for signed-in users
 * (personalised ordering, "is this favourited", hiding blocked sellers).
 *
 * A malformed token on an optional route is ignored rather than rejected: the
 * caller is simply treated as anonymous.
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = extractBearer(req);
  if (!token) {
    next();
    return;
  }

  buildContext(token)
    .then((auth) => {
      req.auth = auth;
      next();
    })
    .catch(() => {
      next();
    });
};

/** Rejects the request unless a valid access token was supplied. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (req.auth) {
    next();
    return;
  }

  const token = extractBearer(req);
  if (!token) {
    next(new UnauthorizedError());
    return;
  }

  buildContext(token)
    .then((auth) => {
      req.auth = auth;
      next();
    })
    .catch(next);
};

/** Reads public.profiles.role for the caller, caching it on the request. */
export async function loadRole(req: Request): Promise<AppRole> {
  const auth = req.auth;
  if (!auth) throw new UnauthorizedError();
  if (auth.role) return auth.role;

  // Read through the user's own client: profiles_public_read covers this and
  // a user can always see their own row.
  const { data, error } = await auth.db
    .from('profiles')
    .select('role, is_banned')
    .eq('id', auth.userId)
    .single();

  if (error || !data) {
    throw new UnauthorizedError('Your account could not be loaded');
  }
  if (data.is_banned) {
    throw new ForbiddenError('This account has been suspended');
  }

  auth.role = data.role;
  return data.role;
}

/** Requires the caller's profile role to be one of `roles`. */
export function requireRole(...roles: AppRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    loadRole(req)
      .then((role) => {
        if (!roles.includes(role)) {
          next(new ForbiddenError('This action requires a different account type'));
          return;
        }
        next();
      })
      .catch(next);
  };
}

/** Platform staff: full moderators and admins. */
export const requireAdmin = requireRole('admin', 'moderator');

/** Admins only — for destructive or financial operations. */
export const requireSuperAdmin = requireRole('admin');

/** Narrowing helper for handlers mounted behind requireAuth. */
export function authOf(req: Request): AuthContext {
  if (!req.auth) throw new UnauthorizedError();
  return req.auth;
}
