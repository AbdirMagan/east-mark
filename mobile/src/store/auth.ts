import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthClient } from '@supabase/auth-js';
import { create } from 'zustand';

import { api } from '../api/endpoints';
import { setTokenProvider } from '../api/client';
import { SUPABASE_ANON_KEY, SUPABASE_URL, WEB_BASE_URL } from '../config';
import type { Profile } from '../api/types';

/**
 * Authentication only -- deliberately the auth package rather than the whole
 * supabase-js client, exactly as the web app does. Listings come from the
 * backend API, which keeps one set of business rules instead of repeating them
 * in every client, so the PostgREST, Realtime and Storage clients would be
 * dead weight in the bundle.
 *
 * The anon key is safe to ship. Row level security is what protects the data.
 */
export const supabaseAuth = new AuthClient({
  url: `${SUPABASE_URL}/auth/v1`,
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
  storageKey: 'em.auth',
  // AsyncStorage rather than the web's localStorage: a phone has no window,
  // and without this the session is gone the moment the app is backgrounded.
  storage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  // No URL to read a token out of on a phone.
  detectSessionInUrl: false,
});

interface AuthState {
  session: Awaited<ReturnType<typeof supabaseAuth.getSession>>['data']['session'];
  profile: Profile | null;
  /** True until the first session check resolves, so guards do not flash. */
  initialising: boolean;
  working: boolean;
  lastError: string | null;

  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  loadProfile: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initialising: true,
  working: false,
  lastError: null,

  init: async () => {
    // The API client asks for a token per request rather than holding one:
    // a captured copy goes stale within the hour, and getSession refreshes
    // when it is close to expiring.
    setTokenProvider(async () => {
      const { data } = await supabaseAuth.getSession();
      return data.session?.access_token ?? null;
    });

    const { data } = await supabaseAuth.getSession();
    set({ session: data.session, initialising: false });
    if (data.session) void get().loadProfile();

    supabaseAuth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) void get().loadProfile();
      else set({ profile: null });
    });
  },

  signIn: async (email, password) => {
    set({ working: true, lastError: null });
    const { data, error } = await supabaseAuth.signInWithPassword({ email, password });
    set({ working: false });
    if (error) {
      // Supabase says "Invalid login credentials" for both a wrong password
      // and an unknown address, which is the right call: telling them apart
      // reveals which addresses have accounts.
      set({ lastError: error.message });
      return false;
    }
    set({ session: data.session });
    void get().loadProfile();
    return true;
  },

  signUp: async (email, password, fullName) => {
    set({ working: true, lastError: null });
    const { data, error } = await supabaseAuth.signUp({
      email,
      password,
      options: {
        // Carried into raw_user_meta_data, which handle_new_user() copies into
        // the profile row.
        data: { full_name: fullName },
        // Say where the confirmation link should land rather than letting it
        // fall back to the project's Site URL, which is a dashboard field and
        // has no business deciding whether a real user can activate.
        emailRedirectTo: `${WEB_BASE_URL}/auth/confirmed`,
      },
    });
    set({ working: false });
    if (error) {
      set({ lastError: error.message });
      return false;
    }
    // With confirmation on, sign-up returns a user but no session. That is
    // expected, not a failure.
    if (data.session) {
      set({ session: data.session });
      void get().loadProfile();
    }
    return true;
  },

  signOut: async () => {
    await supabaseAuth.signOut();
    set({ session: null, profile: null });
  },

  requestPasswordReset: async (email) => {
    set({ working: true, lastError: null });
    const { error } = await supabaseAuth.resetPasswordForEmail(email, {
      // The website, because a phone browser cannot hand a session back to
      // this app. They set the password there and return here to sign in.
      redirectTo: `${WEB_BASE_URL}/reset-password`,
    });
    set({ working: false });
    if (error) {
      set({ lastError: error.message });
      return false;
    }
    // Succeeds whether or not the address has an account, and the screen says
    // the same either way.
    return true;
  },

  loadProfile: async () => {
    try {
      set({ profile: await api.me() });
    } catch {
      // A profile that will not load is not a reason to throw someone out of
      // the app; the screens fall back to the address on the session.
    }
  },
}));
