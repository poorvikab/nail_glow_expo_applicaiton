import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type PropsWithChildren,
} from 'react';
import { type Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────
interface AuthContextValue {
  /** The current Supabase session, or null when unauthenticated. */
  session: Session | null;
  /** True while the provider is restoring a persisted session on launch. */
  isLoading: boolean;
  /** Sign in anonymously — creates a new anon user or resumes a session. */
  signInAnonymously: () => Promise<void>;
  /** Sign out and clear the persisted session. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap: restore persisted session, validate server-side, subscribe
  useEffect(() => {
    const bootstrap = async () => {
      try {
        // 1. Read the locally cached session
        const { data: { session: restored } } = await supabase.auth.getSession();

        if (restored) {
          // 2. Validate the session against Supabase server
          //    getUser() makes a real network request — if the user was
          //    deleted from the Supabase dashboard, this will fail.
          const { error } = await supabase.auth.getUser();

          if (error) {
            // User was deleted or session is invalid → clear everything
            await supabase.auth.signOut();
            setSession(null);
          } else {
            setSession(restored);
          }
        } else {
          setSession(null);
        }
      } catch {
        // Network error or unexpected failure → treat as no session
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();

    // 3. Keep state in sync with any future auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = useCallback(async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    // onAuthStateChange will update `session` automatically
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, isLoading, signInAnonymously, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
