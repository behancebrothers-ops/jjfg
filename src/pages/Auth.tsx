import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Loader2, Mail, Lock, User, ArrowRight, Sparkles, ShoppingBag, Heart, Star, Check, X, Eye, EyeOff, RefreshCw, KeyRound, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { signUpSchema, signInSchema } from "@/lib/validation/schemas";

// Password strength indicator
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const requirements = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Lowercase letter", met: /[a-z]/.test(password) },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Number", met: /\d/.test(password) },
    { label: "Special character", met: /[@$!%*?&#^()_+=\-[\]{}|;:,.<>]/.test(password) },
  ];

  const strength = requirements.filter(r => r.met).length;
  const strengthLabel = strength <= 2 ? "Weak" : strength <= 4 ? "Good" : "Strong";
  const strengthColor = strength <= 2 ? "bg-red-500" : strength <= 4 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : "bg-muted"
              }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${strength <= 2 ? "text-red-500" : strength <= 4 ? "text-amber-500" : "text-green-500"
          }`}>
          {strengthLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={req.met ? "text-green-600" : "text-muted-foreground"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// OTP Email Verification Component
const OTPVerificationView = ({
  email,
  onResend,
  onBackToSignUp,
  onVerified,
  resending
}: {
  email: string;
  onResend: () => void;
  onBackToSignUp: () => void;
  onVerified: () => void;
  resending: boolean;
}) => {
  const [countdown, setCountdown] = useState(60);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = () => {
    if (countdown === 0) {
      onResend();
      setCountdown(60);
      setOtp("");
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setVerifying(true);
    try {
      // Verify the OTP code using standard Supabase Auth
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });

      if (error) {
        toast.error(error.message || "Invalid or expired verification code");
        setVerifying(false);
        return;
      }

      // If valid, session should be established
      if (data.session) {
        toast.success("Account verified successfully!");
        onVerified();
        navigate("/", { replace: true });
      } else {
        // Fallback for cases where session isn't returned immediately
        toast.success("Verification successful! Please sign in.");
        onVerified();
        navigate("/auth", { replace: true });
      }
    } catch (error: any) {
      toast.error("Failed to verify code");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-pink-500 rounded-full shadow-lg shadow-amber-500/30">
        <KeyRound className="h-10 w-10 text-white" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Verify Your Email
        </h2>
        <p className="text-muted-foreground">
          We've sent a 6-digit code to
        </p>
        <p className="font-semibold text-foreground bg-muted/50 px-4 py-2 rounded-lg inline-block">
          {email}
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => setOtp(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-12 h-14 text-xl border-muted-foreground/30" />
              <InputOTPSlot index={1} className="w-12 h-14 text-xl border-muted-foreground/30" />
              <InputOTPSlot index={2} className="w-12 h-14 text-xl border-muted-foreground/30" />
              <InputOTPSlot index={3} className="w-12 h-14 text-xl border-muted-foreground/30" />
              <InputOTPSlot index={4} className="w-12 h-14 text-xl border-muted-foreground/30" />
              <InputOTPSlot index={5} className="w-12 h-14 text-xl border-muted-foreground/30" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerify}
          disabled={otp.length !== 6 || verifying}
          className="w-full h-12 bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30"
        >
          {verifying ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify & Create Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>

        <p className="text-sm text-muted-foreground">
          Code expires in 10 minutes
        </p>

        <Button
          variant="outline"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          className="w-full h-12 rounded-xl border-2 hover:bg-muted/50"
        >
          {resending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Sending...
            </>
          ) : countdown > 0 ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5" />
              Resend in {countdown}s
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-5 w-5" />
              Resend Code
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={onBackToSignUp}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          Back to Sign Up
        </Button>
      </div>
    </motion.div>
  );
};

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get("tab") === "signup");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationPassword, setVerificationPassword] = useState("");
  const [verificationFullName, setVerificationFullName] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    document.title = isSignUp ? "Create Account | Cozy Threads Emporium" : "Sign In | Cozy Threads Emporium";
  }, [isSignUp]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Clear errors when switching modes
  useEffect(() => {
    setErrors({});
    setShowVerification(false);
  }, [isSignUp]);

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
      });

      if (error) {
        toast.error(error.message || "Failed to send verification code");
      } else {
        toast.success("Verification code sent! Please check your inbox.");
      }
    } catch (error) {
      toast.error("Failed to resend verification code");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleBackToSignUp = () => {
    setShowVerification(false);
    setEmail(verificationEmail);
    setPassword(verificationPassword);
    setFullName(verificationFullName);
  };

  const handleVerificationComplete = () => {
    setShowVerification(false);
    setEmail("");
    setPassword("");
    setFullName("");
    setVerificationEmail("");
    setVerificationPassword("");
    setVerificationFullName("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    const validation = signInSchema.safeParse({ email, password });
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
      const { error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else if (error.message.includes("Email not confirmed")) {
          // Show verification screen with resend option
          setVerificationEmail(validation.data.email);
          setShowVerification(true);
          toast.info("Please verify your email before signing in");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error("An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    const validation = signUpSchema.safeParse({ email, password, fullName, phone });
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
      const redirectUrl = `${window.location.origin}/`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validation.data.fullName,
            phone: validation.data.phone,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          toast.error("An account with this email already exists. Please sign in.");
        } else {
          toast.error(signUpError.message);
        }
        return;
      }

      // Check if session is null, which indicates email confirmation is required
      if (signUpData && !signUpData.session) {
        setVerificationEmail(validation.data.email);
        setVerificationPassword(validation.data.password);
        setVerificationFullName(validation.data.fullName);
        setShowVerification(true);
        toast.info("Please verify your email address. OTP code sent.");
      } else {
        // If session exists, user is signed in (email confirmation might be off)
        toast.success("Account created successfully! Welcome to Cozy Threads!");
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      toast.error("An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Navigation />

      <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50 relative overflow-hidden">
        {/* Floating Decorative Orbs (Matching Landing Page) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl"
            animate={{
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-32 right-16 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"
            animate={{
              y: [0, 20, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        <div className="relative z-10 py-16 px-4 min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="w-full max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

              {/* Left side - Branding */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block space-y-8"
              >
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/40 backdrop-blur-md rounded-full border border-white/50 shadow-sm"
                  >
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">Premium Fashion Experience</span>
                  </motion.div>

                  <h1 className="text-5xl font-display font-bold leading-tight">
                    <span className="bg-gradient-to-r from-amber-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                      Your Style,
                    </span>
                    <br />
                    <span className="text-foreground">Your Story</span>
                  </h1>

                  <p className="text-lg text-muted-foreground max-w-md">
                    Join thousands of fashion enthusiasts who trust Cozy Threads for their wardrobe essentials.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: ShoppingBag, label: "Exclusive Collections", value: "500+" },
                    { icon: Heart, label: "Happy Customers", value: "10K+" },
                    { icon: Star, label: "5-Star Reviews", value: "2K+" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="text-center p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm hover:bg-white/60 transition-colors"
                    >
                      <stat.icon className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Right side - Auth form */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md mx-auto lg:mx-0"
              >
                <div className="bg-white/70 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-amber-500/10 border border-white/60">
                  {showVerification ? (
                    <OTPVerificationView
                      email={verificationEmail}
                      onResend={handleResendVerification}
                      onBackToSignUp={handleBackToSignUp}
                      onVerified={handleVerificationComplete}
                      resending={resendingEmail}
                    />
                  ) : (
                    <>
                      {/* Logo */}
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-pink-500 rounded-2xl mb-4 shadow-lg shadow-amber-500/30">
                          <ShoppingBag className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-foreground">
                          {isSignUp ? "Create Account" : "Welcome Back"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isSignUp ? "Start your fashion journey today" : "Sign in to continue shopping"}
                        </p>
                      </div>

                      {/* Toggle */}
                      <div className="flex p-1 bg-muted/30 rounded-xl mb-6 border border-white/20">
                        <button
                          onClick={() => setIsSignUp(false)}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${!isSignUp
                            ? "bg-white text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => setIsSignUp(true)}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${isSignUp
                            ? "bg-white text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          Sign Up
                        </button>
                      </div>

                      {/* Form */}
                      <AnimatePresence mode="wait">
                        <motion.form
                          key={isSignUp ? "signup" : "signin"}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          onSubmit={isSignUp ? handleSignUp : handleSignIn}
                          className="space-y-5"
                        >
                          {isSignUp && (
                            <div className="space-y-2">
                              <Label htmlFor="fullName" className="text-sm font-medium pl-1">Full Name</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  id="fullName"
                                  type="text"
                                  placeholder="John Doe"
                                  value={fullName}
                                  onChange={(e) => setFullName(e.target.value)}
                                  className={`pl-11 h-12 bg-white/50 border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all ${errors.fullName ? 'ring-2 ring-red-500/50' : ''}`}
                                  required
                                />
                              </div>
                              {errors.fullName && (
                                <p className="text-xs text-red-500 pl-1">{errors.fullName}</p>
                              )}
                            </div>
                          )}

                          {isSignUp && (
                            <div className="space-y-2">
                              <Label htmlFor="phone" className="text-sm font-medium pl-1">Phone Number</Label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  id="phone"
                                  type="tel"
                                  placeholder="+92 300 0000000"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  className={`pl-11 h-12 bg-white/50 border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all ${errors.phone ? 'ring-2 ring-red-500/50' : ''}`}
                                  required
                                />
                              </div>
                              {errors.phone && (
                                <p className="text-xs text-red-500 pl-1">{errors.phone}</p>
                              )}
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium pl-1">Email Address</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`pl-11 h-12 bg-white/50 border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all ${errors.email ? 'ring-2 ring-red-500/50' : ''}`}
                                required
                              />
                            </div>
                            {errors.email && (
                              <p className="text-xs text-red-500 pl-1">{errors.email}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium pl-1">Password</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`pl-11 pr-11 h-12 bg-white/50 border-white/60 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all ${errors.password ? 'ring-2 ring-red-500/50' : ''}`}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                            {errors.password && (
                              <p className="text-xs text-red-500 pl-1">{errors.password}</p>
                            )}
                            {isSignUp && password.length > 0 && (
                              <PasswordStrengthIndicator password={password} />
                            )}
                          </div>

                          <Button
                            type="submit"
                            className="w-full h-12 bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/40"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {isSignUp ? "Creating account..." : "Signing in..."}
                              </>
                            ) : (
                              <>
                                {isSignUp ? "Create Account" : "Sign In"}
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </>
                            )}
                          </Button>
                        </motion.form>
                      </AnimatePresence>

                      <p className="text-center text-xs text-muted-foreground mt-6">
                        By continuing, you agree to our{" "}
                        <a href="/terms" className="text-amber-600 hover:underline">Terms</a>
                        {" "}and{" "}
                        <a href="/privacy" className="text-amber-600 hover:underline">Privacy Policy</a>
                      </p>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}