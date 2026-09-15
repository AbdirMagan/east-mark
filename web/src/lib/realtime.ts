import { RealtimeClient } from '@supabase/realtime-js';

import { supabase } from './supabase.js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let client: RealtimeClient | null = null;

/**
 * The websocket client for live messages, created on first use.
 *
 * Only the messages page imports this module, and that page is itself a lazy
 * route, so people who never open a conversation never download the realtime
 * client (lib/supabase.ts explains why that matters on a slow connection).
 *
 * The socket authenticates with the signed-in user's access token, so the
 * change feed is filtered by the same row level security as the API: a user
 * only ever receives messages from conversations they are part of.
 */
export async function getRealtime(): Promise<RealtimeClient> {
  if (!client) {
    client = new RealtimeClient(`${url.replace(/^http/, 'ws')}/realtime/v1`, {
      params: { apikey: anonKey },
    });

    // Access tokens rotate roughly hourly. Keep the socket's copy current, or
    // a long-open inbox would silently stop receiving messages.
    supabase.auth.onAuthStateChange((_event, session) => {
      void client?.setAuth(session?.access_token ?? null);
    });
  }

  const { data } = await supabase.auth.getSession();
  await client.setAuth(data.session?.access_token ?? null);
  return client;
}
