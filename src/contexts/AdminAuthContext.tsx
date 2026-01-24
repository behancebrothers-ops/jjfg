import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "./AuthContext";

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  revalidate: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Cache admin status for 5 minutes to reduce DB calls
const ADMIN_CACHE_KEY = 'admin_status_cache';
const ADMIN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface AdminCache {
  isAdmin: boolean;
  userId: string;
  timestamp: number;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { user, session, isLoading: authLoading, isAuthenticated: authAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastVerifiedUserId = useRef<string | null>(null);
  const verificationInProgress = useRef(false);

  // Get cached admin status
  const getCachedAdminStatus = useCallback((userId: string): boolean | null => {
    try {
      const cached = sessionStorage.getItem(ADMIN_CACHE_KEY);
      if (cached) {
        const data: AdminCache = JSON.parse(cached);
        if (data.userId === userId && (Date.now() - data.timestamp) < ADMIN_CACHE_DURATION) {
          return data.isAdmin;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  }, []);

  // Set cached admin status
  const setCachedAdminStatus = useCallback((userId: string, adminStatus: boolean) => {
    try {
      const data: AdminCache = {
        isAdmin: adminStatus,
        userId,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      // Ignore cache errors
    }
  }, []);

  // Clear admin cache
  const clearAdminCache = useCallback(() => {
    try {
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
    } catch (e) {
      // Ignore cache errors
    }
  }, []);

  const verifyAdminStatus = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent verification
    if (verificationInProgress.current) return;
    
    // If not authenticated via main auth, clear admin state
    if (!authAuthenticated || !user) {
      setIsAdmin(false);
      setIsLoading(false);
      lastVerifiedUserId.current = null;
      clearAdminCache();
      return;
    }

    // Skip if already verified for this user (unless forced)
    if (!forceRefresh && lastVerifiedUserId.current === user.id) {
      return;
    }

    // Check cache first (unless forced)
    if (!forceRefresh) {
      const cachedStatus = getCachedAdminStatus(user.id);
      if (cachedStatus !== null) {
        setIsAdmin(cachedStatus);
        setIsLoading(false);
        lastVerifiedUserId.current = user.id;
        return;
      }
    }

    verificationInProgress.current = true;
    
    try {
      setIsLoading(true);

      // Check admin role from database using the current session token
      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        logger.error('Error checking admin role', roleError);
        setIsAdmin(false);
        clearAdminCache();
      } else {
        const adminStatus = !!userRoles;
        setIsAdmin(adminStatus);
        setCachedAdminStatus(user.id, adminStatus);
        lastVerifiedUserId.current = user.id;
        logger.info('Admin status verified', { userId: user.id, isAdmin: adminStatus });
      }
    } catch (error) {
      logger.error('Admin verification error', error);
      setIsAdmin(false);
      clearAdminCache();
    } finally {
      setIsLoading(false);
      verificationInProgress.current = false;
    }
  }, [user, authAuthenticated, getCachedAdminStatus, setCachedAdminStatus, clearAdminCache]);

  // React to auth state changes from parent AuthContext
  useEffect(() => {
    if (authLoading) {
      // Still loading auth, keep admin loading too
      setIsLoading(true);
      return;
    }

    if (!authAuthenticated || !user) {
      // Not authenticated, clear admin state
      setIsAdmin(false);
      setIsLoading(false);
      lastVerifiedUserId.current = null;
      clearAdminCache();
      return;
    }

    // User is authenticated, verify admin status
    verifyAdminStatus();
  }, [authLoading, authAuthenticated, user, verifyAdminStatus, clearAdminCache]);

  // Listen for auth state changes specifically for token refresh and sign out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setIsLoading(false);
        lastVerifiedUserId.current = null;
        clearAdminCache();
      } else if (event === 'TOKEN_REFRESHED') {
        // Re-verify admin status with fresh token
        if (user) {
          // Use setTimeout to avoid potential deadlock
          setTimeout(() => {
            verifyAdminStatus(true);
          }, 0);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [user, verifyAdminStatus, clearAdminCache]);

  const contextValue: AdminAuthContextType = {
    isAdmin,
    isLoading: isLoading || authLoading,
    isAuthenticated: authAuthenticated,
    userId: user?.id ?? null,
    revalidate: () => verifyAdminStatus(true),
  };

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
