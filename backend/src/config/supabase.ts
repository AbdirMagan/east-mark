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

/** Service-role client. Bypasses RLS. Never hand this to request handlers by default. */
export const admin: Db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  ...commonOptions,
  global: { ...commonOptions.global, headers: { 'X-Client-Info': 'east-market-backend/admin' } },
});

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
