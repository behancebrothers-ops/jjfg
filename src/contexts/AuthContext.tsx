import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        logger.warn("Session refresh failed", error);
        return;
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (err) {
      logger.warn("Session refresh exception", err);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // Listener should update state, but keep a local fallback to avoid UI desync.
      setSession(null);
      setUser(null);
    } catch (err) {
      logger.error("Error signing out", err);
      setSession(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1) Listen for auth changes (sync callback; no nested supabase calls)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Do not force sign-outs based on temporary session nulls; only react to events.
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
      }
    });

    // 2) Load initial session
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;

        if (error) {
          logger.warn("Error getting initial session", error);
        }

        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
