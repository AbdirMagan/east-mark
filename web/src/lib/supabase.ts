import { AuthClient } from '@supabase/auth-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.',
  );
}

/**
 * Authentication only — and deliberately the auth package on its own rather
 * than the full supabase-js client.
 *
 * The web app never queries Supabase directly: marketplace data comes from the
 * backend API, which returns card-shaped rows and keeps one set of business
 * rules instead of duplicating them across web, Android and iOS. That means
 * the PostgREST, Realtime, Storage and Functions clients bundled into
 * supabase-js are all dead weight here — and measurably so: the full client is
 * 58.5 KB gzipped, the largest chunk in the build, against 22 KB for auth
 * alone. On a 2G connection that difference is several seconds of blank screen
 * on a first visit.
 *
 * When realtime messaging lands it will import supabase-js lazily on the
 * messages route, so the people who never open a conversation never pay for
 * the websocket client.
 *
 * The anon key is safe to ship. Row level security is what protects the data.
 */
export const auth = new AuthClient({
  url: `${url}/auth/v1`,
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  },
  storageKey: 'em.auth',
  autoRefreshToken: true,
  persistSession: true,
  // Handles the #access_token fragment after an email confirmation link.
  detectSessionInUrl: true,
});

/** Kept as a named export so call sites read the same as the mobile clients. */
export const supabase = { auth };
