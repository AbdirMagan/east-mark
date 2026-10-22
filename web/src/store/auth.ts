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
  /** Sends the "set a new password" email. Never says whether the address exists. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Sets a new password for whoever the current (recovery) session belongs to. */
  updatePassword: (password: string) => Promise<void>;
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
      options: {
        // Carried into raw_user_meta_data, which the handle_new_user() trigger
        // copies into the profile row.
        data: { full_name: fullName },
        // Where the link in the confirmation email lands. Without this
        // Supabase falls back to the project's Site URL, which is whatever it
        // was last set to in the dashboard -- a sign-up that works in
        // development and sends every real user to a dead localhost address.
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
      },
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

  requestPasswordReset: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Same reasoning as sign-up: say where the link should land rather than
      // letting it fall back to whatever the project's Site URL happens to be.
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // Supabase answers the same way whether or not the address has an account,
    // and so does the page that calls this. Confirming which addresses are
    // registered would hand an attacker a list of who to go after.
    if (error) throw error;
  },

  updatePassword: async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    // The recovery link signed them in to make this call possible, so they are
    // already through the door -- keep the session rather than making someone
    // who has just proved they own the address type the new password again.
    if (data.user) {
      const { data: current } = await supabase.auth.getSession();
      set({ session: current.session });
    }
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
