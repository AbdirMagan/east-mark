import type { Session } from '@supabase/auth-js';
import { create } from 'zustand';

import { supabase } from '../lib/supabase.js';

interface AuthState {
  session: Session | null;
  /** True until the first session check resolves, so guards do not flash. */
  initialising: boolean;
  setSession: (session: Session | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  initialising: true,

  setSession: (session) => set({ session, initialising: false }),

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    set({ session: data.session });
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Carried into raw_user_meta_data, which the handle_new_user() trigger
      // copies into the profile row.
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;

    // With email confirmation enabled, sign-up returns a user but no session.
    if (data.session) {
      set({ session: data.session });
      return { needsConfirmation: false };
    }
    return { needsConfirmation: true };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));

/**
 * Wires Supabase's session into the store.
 *
 * onAuthStateChange also fires on token refresh, so a long-lived tab keeps a
 * valid token without the API ever seeing a 401.
 */
export function initAuth(): () => void {
  void supabase.auth.getSession().then(({ data }) => {
    useAuth.getState().setSession(data.session);
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.getState().setSession(session);
  });

  return () => data.subscription.unsubscribe();
}
