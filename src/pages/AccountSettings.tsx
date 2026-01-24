import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmailTwoFactorSetup } from "@/components/EmailTwoFactorSetup";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import {
  Mail, Phone, ShieldCheck, Lock, Bell, Trash2, CheckCircle2, AlertCircle,
  ArrowLeft, Settings, Eye, EyeOff, Loader2, User
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const AccountSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // Verification states
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);

  // Newsletter
  const [isSubscribedToNewsletter, setIsSubscribedToNewsletter] = useState<boolean | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Loading states
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        setNewEmail(user.email || "");
        setNewPhone(user.user_metadata?.phone || "");
        await checkNewsletterStatus(user.email || "");
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  // Cooldown timers
  useEffect(() => {
    if (emailResendCooldown > 0) {
      const timer = setTimeout(() => setEmailResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailResendCooldown]);

  useEffect(() => {
    if (phoneResendCooldown > 0) {
      const timer = setTimeout(() => setPhoneResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneResendCooldown]);

  // Handlers
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail === user.email) {
      toast.info("This is already your current email");
      return;
    }
    setSavingEmail(true);
    try {
      const { data: rateLimitCheck } = await supabase.functions.invoke('check-otp-rate-limit', {
        body: { identifier: newEmail, otp_type: 'email_change', action: 'check' }
      });
      if (rateLimitCheck && !rateLimitCheck.allowed) {
        toast.error(rateLimitCheck.message || "Too many attempts. Try again later.");
        setSavingEmail(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      await supabase.functions.invoke('check-otp-rate-limit', {
        body: { identifier: newEmail, otp_type: 'email_change', action: 'record' }
      });

      setPendingEmail(newEmail);
      setNeedsEmailVerification(true);
      toast.success("Verification code sent to your new email!");
    } catch (error: any) {
      toast.error(error.message);
    }
    setSavingEmail(false);
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.length !== 6) {
      toast.error("Enter a 6-digit code");
      return;
    }
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: emailOtp,
        type: 'email_change',
      });
      if (error) throw error;

      await supabase.functions.invoke('check-otp-rate-limit', {
        body: { identifier: pendingEmail, otp_type: 'email_change', action: 'reset' }
      });

      toast.success("Email updated successfully!");
      setNeedsEmailVerification(false);
      setEmailOtp("");
      setPendingEmail("");
      // Refresh user data
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser) setUser(updatedUser);
    } catch (error: any) {
      toast.error("Invalid code. Please try again.");
    }
  };

  const handlePhoneChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhone(true);
    try {
      const { data: rateLimitCheck } = await supabase.functions.invoke('check-otp-rate-limit', {
        body: { identifier: newPhone, otp_type: 'phone_change', action: 'check' }
      });
      if (rateLimitCheck && !rateLimitCheck.allowed) {
        toast.error(rateLimitCheck.message || "Too many attempts. Try again later.");
        setSavingPhone(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ phone: newPhone });
      if (error) throw error;

      await supabase.functions.invoke('check-otp-rate-limit', {
        body: { identifier: newPhone, otp_type: 'phone_change', action: 'record' }
      });

      setPendingPhone(newPhone);
      setNeedsPhoneVerification(true);
      toast.success("Verification code sent via SMS!");
    } catch (error: any) {
      toast.error(error.message);
    }
    setSavingPhone(false);
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneOtp.length !== 6) {
      toast.error("Enter a 6-digit code");
      return;
    }
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: phoneOtp,
        type: 'phone_change',
      });
      if (error) throw error;

      await supabase.functions.invoke('check-otp-rate-limit', {
        body: { identifier: pendingPhone, otp_type: 'phone_change', action: 'reset' }
      });

      toast.success("Phone updated successfully!");
      setNeedsPhoneVerification(false);
      setPhoneOtp("");
      setPendingPhone("");
    } catch (error: any) {
      toast.error("Invalid code. Please try again.");
    }
  };

  const handleResendEmailOtp = async () => {
    if (emailResendCooldown > 0) return;
    try {
      const { error } = await supabase.auth.resend({ type: 'email_change', email: pendingEmail });
      if (error) throw error;
      toast.success("New code sent!");
      setEmailResendCooldown(60);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleResendPhoneOtp = async () => {
    if (phoneResendCooldown > 0) return;
    try {
      const { error } = await supabase.auth.resend({ type: 'phone_change', phone: pendingPhone });
      if (error) throw error;
      toast.success("New code sent via SMS!");
      setPhoneResendCooldown(60);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const checkNewsletterStatus = async (email: string) => {
    try {
      setCheckingSubscription(true);
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('subscribed')
        .eq('email', email)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      setIsSubscribedToNewsletter(data?.subscribed ?? false);
    } catch (error) {
      console.error(error);
      setIsSubscribedToNewsletter(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleNewsletterToggle = async (subscribe: boolean) => {
    try {
      const fn = subscribe ? 'newsletter-subscribe' : 'newsletter-unsubscribe';
      const { error } = await supabase.functions.invoke(fn, { body: { email: user.email } });
      if (error) throw error;
      setIsSubscribedToNewsletter(subscribe);
      toast.success(subscribe ? "Subscribed to newsletter!" : "Unsubscribed from newsletter");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      toast.info("Please contact support at support@luxee.pk to delete your account.");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 animate-pulse" />
            <Loader2 className="h-8 w-8 animate-spin text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground font-medium">Loading settings...</p>
        </motion.div>
      </div>
    );
  }

  // Email Verification Screen
  if (needsEmailVerification) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
        <Navigation />
        <main className="flex-grow container mx-auto px-4 py-16 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-amber-100 rounded-2xl overflow-hidden">
              <CardHeader className="text-center pb-6 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-display">Verify Your Email</CardTitle>
                <CardDescription className="text-base">
                  We sent a code to <span className="font-semibold text-amber-700">{pendingEmail}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleVerifyEmail} className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={emailOtp} onChange={setEmailOtp}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className="h-14 w-12 text-2xl font-bold border-2 border-amber-200 bg-amber-50/50 rounded-xl focus:border-amber-500"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={emailOtp.length !== 6}
                      className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl"
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Verify Email
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setNeedsEmailVerification(false); setEmailOtp(""); }}
                      className="h-12 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendEmailOtp}
                    disabled={emailResendCooldown > 0}
                    className="w-full text-amber-600 hover:text-amber-700"
                  >
                    {emailResendCooldown > 0 ? `Resend in ${emailResendCooldown}s` : "Resend Code"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // Phone Verification Screen
  if (needsPhoneVerification) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
        <Navigation />
        <main className="flex-grow container mx-auto px-4 py-16 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-pink-100 rounded-2xl overflow-hidden">
              <CardHeader className="text-center pb-6 bg-gradient-to-r from-pink-50 to-rose-50">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-display">Verify Your Phone</CardTitle>
                <CardDescription className="text-base">
                  SMS sent to <span className="font-semibold text-pink-700">{pendingPhone}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleVerifyPhone} className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={phoneOtp} onChange={setPhoneOtp}>
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot
                            key={i}
                            index={i}
                            className="h-14 w-12 text-2xl font-bold border-2 border-pink-200 bg-pink-50/50 rounded-xl focus:border-pink-500"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={phoneOtp.length !== 6}
                      className="flex-1 h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-xl"
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Verify Phone
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setNeedsPhoneVerification(false); setPhoneOtp(""); }}
                      className="h-12 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendPhoneOtp}
                    disabled={phoneResendCooldown > 0}
                    className="w-full text-pink-600 hover:text-pink-700"
                  >
                    {phoneResendCooldown > 0 ? `Resend in ${phoneResendCooldown}s` : "Resend SMS"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // Main Settings Page
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-32 left-10 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"
          animate={{ y: [0, 20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <Navigation />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Link>

            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl border border-white/60">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                    Account Settings
                  </h1>
                  <p className="text-muted-foreground">Manage your security and preferences</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Settings Cards */}
          <div className="space-y-6">
            {/* Email Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/70 backdrop-blur-xl border-white/40 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 border-b border-amber-100/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      Email Address
                    </CardTitle>
                    {user.email_confirmed_at ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Unverified
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    Current: <span className="font-medium text-foreground">{user.email}</span>
                    {!user.email_confirmed_at && (
                      <span className="ml-2 text-amber-600 text-xs">(Verification required)</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleEmailChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newEmail">New Email</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={savingEmail || newEmail === user.email}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl"
                    >
                      {savingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Update Email
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Phone Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="bg-white/70 backdrop-blur-xl border-white/40 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-pink-50/50 to-rose-50/50 border-b border-pink-100/50">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    Phone Number
                  </CardTitle>
                  <CardDescription>Current: <span className="font-medium text-foreground">{user.user_metadata?.phone || "Not set"}</span></CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handlePhoneChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPhone">Phone Number</Label>
                      <Input
                        id="newPhone"
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+92 300 0000000"
                        className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500/20"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={savingPhone}
                      className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-xl"
                    >
                      {savingPhone ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Update Phone
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Password Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/70 backdrop-blur-xl border-white/40 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-50/50 to-pink-50/50 border-b border-amber-100/50">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-pink-600 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-white" />
                    </div>
                    Change Password
                  </CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-12 bg-white/50 border-gray-200 rounded-xl pr-12 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={savingPassword || !newPassword || !confirmPassword}
                      className="bg-gradient-to-r from-amber-600 to-pink-600 hover:from-amber-700 hover:to-pink-700 text-white font-semibold rounded-xl"
                    >
                      {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Update Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* 2FA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <EmailTwoFactorSetup />
            </motion.div>

            {/* Notification Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <NotificationPreferences />
            </motion.div>

            {/* Newsletter Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="bg-white/70 backdrop-blur-xl border-white/40 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-50/50 to-pink-50/50 border-b border-amber-100/50">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    Newsletter
                  </CardTitle>
                  <CardDescription>Stay updated with our latest offers</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {checkingSubscription ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Checking subscription status...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50/50 to-pink-50/50 border border-amber-100/50">
                        <div>
                          <p className="font-semibold">Luxee Updates</p>
                          <p className="text-sm text-muted-foreground">
                            {isSubscribedToNewsletter ? "You're receiving our newsletter" : "Get exclusive deals and updates"}
                          </p>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-sm font-semibold ${isSubscribedToNewsletter
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                          {isSubscribedToNewsletter ? '✓ Subscribed' : 'Not Subscribed'}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleNewsletterToggle(!isSubscribedToNewsletter)}
                        variant={isSubscribedToNewsletter ? "outline" : "default"}
                        className={isSubscribedToNewsletter
                          ? "w-full rounded-xl"
                          : "w-full bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white rounded-xl"
                        }
                      >
                        {isSubscribedToNewsletter ? "Unsubscribe" : "Subscribe Now"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/70 backdrop-blur-xl border-red-200/50 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-50/50 to-rose-50/50 border-b border-red-100/50">
                  <CardTitle className="flex items-center gap-3 text-red-600">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    Danger Zone
                  </CardTitle>
                  <CardDescription>Permanent actions that cannot be undone</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Alert className="border-red-200 bg-red-50/50 mb-4">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      Deleting your account will permanently remove all your data, orders, and preferences.
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 font-semibold rounded-xl"
                  >
                    <Trash2 className="mr-2 h-5 w-5" />
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AccountSettings;
