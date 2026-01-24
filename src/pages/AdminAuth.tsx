import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Mail, Loader2, Eye, EyeOff, AlertCircle, Sparkles, KeyRound } from "lucide-react";
import { logger } from "@/lib/logger";
import { adminSignInSchema } from "@/lib/validation/schemas";

const ROUTES = {
  ADMIN: '/admin',
} as const;

const ROLES = {
  ADMIN: 'admin',
} as const;

const ERROR_MESSAGES = {
  NO_SESSION: "Failed to create session",
  ACCESS_DENIED: "You do not have administrator privileges",
  UNEXPECTED: "An unexpected error occurred. Please try again.",
  INVALID_EMAIL: "Please enter a valid email address",
  INVALID_PASSWORD: "Password is required",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  TOO_MANY_ATTEMPTS: "Too many login attempts. Please wait before trying again.",
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_NOT_CONFIRMED: "Please verify your email address",
} as const;

const getAuthErrorMessage = (error: any): string => {
  if (!error) return ERROR_MESSAGES.INVALID_CREDENTIALS;
  
  if (error.message?.includes("Email not confirmed")) {
    return ERROR_MESSAGES.EMAIL_NOT_CONFIRMED;
  }
  if (error.message?.includes("network") || error.name === "NetworkError") {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (error.status === 429) {
    return ERROR_MESSAGES.TOO_MANY_ATTEMPTS;
  }
  
  return ERROR_MESSAGES.INVALID_CREDENTIALS;
};

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.name === "NetworkError" || error.message.includes("Failed to fetch");
  }
  return false;
};

const RATE_LIMIT = {
  MAX_ATTEMPTS: 3,
  BASE_BLOCK_MS: 5000,
  MAX_BLOCK_MS: 300000,
} as const;

export default function AdminAuth() {
  const navigate = useNavigate();
  const { toast, dismiss } = useToast();
  const { isAdmin, isLoading: checkingSession, revalidate } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginAttempts, setLoginAttempts] = useState(() => {
    const stored = sessionStorage.getItem('admin_login_attempts');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [blockedUntil, setBlockedUntil] = useState<number | null>(() => {
    const stored = sessionStorage.getItem('admin_blocked_until');
    return stored ? parseInt(stored, 10) : null;
  });
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const isMountedRef = useRef(true);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef<string>();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (toastIdRef.current) {
        toastIdRef.current = undefined;
      }
    };
  }, []);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('admin_login_attempts', loginAttempts.toString());
  }, [loginAttempts]);

  useEffect(() => {
    if (blockedUntil) {
      sessionStorage.setItem('admin_blocked_until', blockedUntil.toString());
    } else {
      sessionStorage.removeItem('admin_blocked_until');
    }
  }, [blockedUntil]);

  useEffect(() => {
    if (!blockedUntil || Date.now() >= blockedUntil) {
      setRemainingSeconds(0);
      return;
    }
    
    const interval = setInterval(() => {
      const remaining = Math.ceil((blockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setBlockedUntil(null);
        setRemainingSeconds(0);
        sessionStorage.removeItem('admin_blocked_until');
      } else {
        setRemainingSeconds(remaining);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [blockedUntil]);

  useEffect(() => {
    if (!checkingSession && isAdmin) {
      navigate(ROUTES.ADMIN, { replace: true });
    }
  }, [isAdmin, checkingSession, navigate]);

  const isBlocked = useMemo(() => {
    if (!blockedUntil) return false;
    return Date.now() < blockedUntil;
  }, [blockedUntil, remainingSeconds]);

  const showToast = useCallback((title: string, description: string, variant: "default" | "destructive" = "destructive") => {
    if (toastIdRef.current) {
      dismiss(toastIdRef.current);
    }
    const { id } = toast({ title, description, variant });
    toastIdRef.current = id;
  }, [toast, dismiss]);

  const handleLogin = useCallback(async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrors({});
    
    if (!isMountedRef.current) return;

    if (isBlocked) {
      showToast(
        "Too Many Attempts",
        `Please wait ${remainingSeconds} seconds before trying again.`,
        "destructive"
      );
      return;
    }

    // Validate input
    const validation = adminSignInSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (!isMountedRef.current) return;

      if (authError) {
        setPassword("");
        
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= RATE_LIMIT.MAX_ATTEMPTS) {
          const blockDuration = Math.min(
            Math.pow(2, newAttempts - RATE_LIMIT.MAX_ATTEMPTS) * RATE_LIMIT.BASE_BLOCK_MS,
            RATE_LIMIT.MAX_BLOCK_MS
          );
          const newBlockedUntil = Date.now() + blockDuration;
          setBlockedUntil(newBlockedUntil);
          
          logger.warn("Admin login rate limit triggered", { 
            attempts: newAttempts, 
            blockDurationMs: blockDuration 
          });
        }
        
        emailInputRef.current?.focus();
        
        const errorMessage = getAuthErrorMessage(authError);
        showToast("Login Failed", errorMessage, "destructive");
        return;
      }

      if (!authData.session) {
        setPassword("");
        setLoginAttempts(prev => prev + 1);
        emailInputRef.current?.focus();
        showToast("Login Failed", ERROR_MESSAGES.NO_SESSION, "destructive");
        return;
      }

      const { data: userRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.session.user.id)
        .eq('role', ROLES.ADMIN)
        .maybeSingle();

      if (!isMountedRef.current) return;

      if (roleError || !userRoles) {
        const { error: signOutError } = await supabase.auth.signOut();
        
        if (signOutError) {
          logger.error("Failed to sign out after admin check", signOutError);
        }

        setEmail("");
        setPassword("");
        setLoginAttempts(prev => prev + 1);
        emailInputRef.current?.focus();
        
        showToast("Access Denied", ERROR_MESSAGES.ACCESS_DENIED, "destructive");
        return;
      }

      setErrors({});
      setLoginAttempts(0);
      setBlockedUntil(null);
      sessionStorage.removeItem('admin_login_attempts');
      sessionStorage.removeItem('admin_blocked_until');

      showToast("Welcome!", "Successfully logged in as administrator", "default");

      if (typeof revalidate === 'function') {
        try {
          await revalidate();
        } catch (revalidateError) {
          logger.error("Failed to revalidate admin context", revalidateError);
        }
      }
      
      if (!isMountedRef.current) return;
      
      navigate(ROUTES.ADMIN, { replace: true });
    } catch (error) {
      if (!isMountedRef.current) return;

      setPassword("");
      setLoginAttempts(prev => prev + 1);
      emailInputRef.current?.focus();

      const errorMessage = isNetworkError(error) 
        ? ERROR_MESSAGES.NETWORK_ERROR 
        : ERROR_MESSAGES.UNEXPECTED;

      logger.error("Unexpected admin login error", error);
      
      showToast("Error", errorMessage, "destructive");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [email, password, navigate, revalidate, loginAttempts, isBlocked, remainingSeconds, showToast]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-zinc-400">Checking session...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden px-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[150px]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glowing border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/50 to-amber-500/50 rounded-3xl blur opacity-30" />
        
        <div className="relative bg-zinc-900/90 backdrop-blur-xl rounded-3xl p-8 border border-zinc-800/50 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl mb-6 shadow-lg shadow-amber-500/30"
            >
              <Shield className="h-10 w-10 text-zinc-900" />
            </motion.div>
            
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold tracking-[0.2em] text-amber-400 uppercase">Admin Portal</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-zinc-400 text-sm">Sign in to access the admin dashboard</p>
          </div>

          {/* Security notice */}
          <div className="mb-6 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl flex items-start gap-3">
            <KeyRound className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-400">
              <p className="font-medium text-zinc-300 mb-1">Secure Access</p>
              <p>This portal is protected. All login attempts are monitored.</p>
            </div>
          </div>

          {/* Rate limit warning */}
          {isBlocked && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">
                Too many failed attempts. Please wait {remainingSeconds} second{remainingSeconds !== 1 ? 's' : ''} before trying again.
              </p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Mail className="h-4 w-4 text-zinc-500" />
                Email Address
              </Label>
              <Input
                ref={emailInputRef}
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                onBlur={(e) => setEmail(e.target.value.trim())}
                required
                autoComplete="email"
                disabled={loading || isBlocked}
                className={`h-12 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 rounded-xl focus:border-amber-500/50 focus:ring-amber-500/20 ${errors.email ? 'border-red-500/50 ring-1 ring-red-500/30' : ''}`}
              />
              {errors.email && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 flex items-center gap-1.5"
                >
                  <AlertCircle className="h-4 w-4" />
                  {errors.email}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Lock className="h-4 w-4 text-zinc-500" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  required
                  autoComplete="current-password"
                  disabled={loading || isBlocked}
                  className={`h-12 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 rounded-xl pr-12 focus:border-amber-500/50 focus:ring-amber-500/20 ${errors.password ? 'border-red-500/50 ring-1 ring-red-500/30' : ''}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-zinc-400 hover:text-white hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || isBlocked}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 flex items-center gap-1.5"
                >
                  <AlertCircle className="h-4 w-4" />
                  {errors.password}
                </motion.p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-900 font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/30"
              disabled={loading || isBlocked}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : isBlocked ? (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Wait {remainingSeconds}s
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Sign In to Dashboard
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center">
            <p className="text-xs text-zinc-500">
              Protected area. Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}