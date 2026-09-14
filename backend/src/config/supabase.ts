import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { createResilientFetch } from './resilientFetch.js';
import type { Database } from '../types/database.js';
import { env } from './env.js';

export type Db = SupabaseClient<Database>;

/**
 * THE MOST IMPORTANT RULE IN THIS CODEBASE.
 *
 * There are two ways to reach the database, and picking the wrong one is how
 * marketplaces leak their users' data.
 *
 * `asUser(token)` forwards the caller's access token, so every query is
 * evaluated under row level security. A bug in a filter cannot expose another
 * user's conversations, because the database refuses to return them. This is
 * the default and should be used for essentially every request made on behalf
 * of a signed-in person.
 *
 * `admin` uses the service-role key and BYPASSES row level security entirely.
 * It exists for the handful of jobs the platform does as itself: moderation
 * decisions, payment reconciliation, scheduled jobs, and reading the private
 * columns the schema deliberately hides from clients. Every call site must be
 * able to answer "why is it safe for this to see every row in the table?"
 *
 * If you find yourself reaching for `admin` to make a query work, the usual
 * cause is a missing RLS policy, not a reason to bypass them.
 */

const commonOptions = {
  auth: {
    // The server holds no session. Tokens arrive per request.
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  // Timeout + bounded retry on connection blips. Only GET/HEAD are retried;
  // see resilientFetch.ts for why writes deliberately fail fast.
  global: { fetch: createResilientFetch() },
} as const;

/**
 * Service-role client. Bypasses RLS.
 *
 * Built lazily so the API can run locally without the secret key — most
 * endpoints never touch it. Reaching for it when it is not configured throws
 * here, with a message that says what to do, rather than constructing a
 * client with an empty key that fails later as an opaque 401 from PostgREST.
 */
let adminClient: Db | null = null;

export function admin(): Db {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'This operation needs SUPABASE_SERVICE_ROLE_KEY, which is not set. ' +
        'Add it to backend/.env from Dashboard -> Settings -> API (service_role, secret). ' +
        'It bypasses row level security, so it must never appear in a client build.',
    );
  }

  adminClient ??= createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    ...commonOptions,
    global: { ...commonOptions.global, headers: { 'X-Client-Info': 'east-market-backend/admin' } },
  });

  return adminClient;
}

/** True when service-role operations are available in this environment. */
export const hasServiceRole = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

/** Anonymous client, for public reads made without a signed-in user. */
export const anon: Db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  ...commonOptions,
  global: { ...commonOptions.global, headers: { 'X-Client-Info': 'east-market-backend/anon' } },
});

/**
 * A client that acts as the given user. All RLS policies apply.
 * Pass the raw access token from the Authorization header.
 */
export function asUser(accessToken: string): Db {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...commonOptions,
    global: {
      ...commonOptions.global,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Client-Info': 'east-market-backend/user',
      },
    },
  });
}
