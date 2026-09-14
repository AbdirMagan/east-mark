import type { Db } from '../config/supabase.js';
import type { Database } from './database.js';

export type AppRole = Database['public']['Enums']['user_role'];

export interface AuthContext {
  /** auth.users.id — the same uuid as profiles.id. */
  userId: string;
  email?: string;
  /** The raw access token, forwarded to PostgREST so RLS applies. */
  token: string;
  /**
   * A Supabase client scoped to this user. Every query through it is subject
   * to row level security. Prefer it over the service-role client.
   */
  db: Db;
  /** public.profiles.role, loaded lazily by requireRole/requireAdmin. */
  role?: AppRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Present only when a valid access token was supplied. */
      auth?: AuthContext;
      // `id` is contributed by pino-http's own augmentation (typed ReqId).
      // requestContext.ts always assigns a string; read it via String(req.id).
    }
  }
}

export {};
