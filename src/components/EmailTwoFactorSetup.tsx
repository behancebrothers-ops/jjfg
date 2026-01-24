import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { logger } from "@/lib/logger";

export function EmailTwoFactorSetup() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    check2FAStatus();
  }, []);

  const check2FAStatus = async () => {
    try {
      setChecking(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user");
      }

      setEmail(user.email || "");

      const { data, error } = await supabase.functions.invoke('check-2fa-status', {
        body: { userId: user.id }
      });

      if (error) throw error;

      setIs2FAEnabled(data.enabled || false);
    } catch (error: any) {
      logger.error("Error checking 2FA status", error);
      toast({
        title: "Error",
        description: "Failed to check 2FA status",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user");
      }

      logger.info("Attempting to send 2FA code", { userId: user.id });

      // Send verification code
      const { data, error } = await supabase.functions.invoke('send-2fa-code', {
        body: { 
          userId: user.id,
          email: user.email,
          type: 'enable'
        }
      });

      logger.info("2FA code response", { data, error });

      if (error) {
        logger.error("Edge function returned error", error);
        throw new Error(error.message || "Failed to send verification code");
      }

      setVerificationStep(true);
      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the verification code",
      });
    } catch (error: any) {
      logger.error("Error enabling 2FA", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user");
      }

      // Verify the code
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-2fa-code', {
        body: { 
          userId: user.id,
          code: verificationCode
        }
      });

      if (verifyError || !verifyData?.valid) {
        throw new Error("Invalid or expired verification code");
      }

      // Enable 2FA
      const { error: toggleError } = await supabase.functions.invoke('toggle-2fa', {
        body: { 
          userId: user.id,
          email: user.email,
          enabled: true
        }
      });

      if (toggleError) throw toggleError;

      setIs2FAEnabled(true);
      setVerificationStep(false);
      setVerificationCode("");
      
      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled",
      });
    } catch (error: any) {
      logger.error("Error verifying 2FA code", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No authenticated user");
      }

      const { error } = await supabase.functions.invoke('toggle-2fa', {
        body: { 
          userId: user.id,
          email: user.email,
          enabled: false
        }
      });

      if (error) throw error;

      setIs2FAEnabled(false);
      
      toast({
        title: "Success",
        description: "Two-factor authentication has been disabled",
      });
    } catch (error: any) {
      logger.error("Error disabling 2FA", error);
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelVerification = () => {
    setVerificationStep(false);
    setVerificationCode("");
  };

  if (checking) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (verificationStep) {
    return (
      <Card className="border-primary/20">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-center gap-3 text-primary">
            <Mail className="h-5 w-5" />
            <h3 className="font-semibold">Verify Your Email</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            We've sent a 6-digit verification code to <strong>{email}</strong>. Please enter it below:
          </p>

          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={setVerificationCode}
                data-testid="2fa-verification-input"
                className="gap-3"
              >
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot index={0} className="h-14 w-14 text-2xl font-bold border-2 border-primary/30 hover:border-primary/50 focus:border-primary transition-all rounded-xl" />
                  <InputOTPSlot index={1} className="h-14 w-14 text-2xl font-bold border-2 border-primary/30 hover:border-primary/50 focus:border-primary transition-all rounded-xl" />
                  <InputOTPSlot index={2} className="h-14 w-14 text-2xl font-bold border-2 border-primary/30 hover:border-primary/50 focus:border-primary transition-all rounded-xl" />
                  <InputOTPSlot index={3} className="h-14 w-14 text-2xl font-bold border-2 border-primary/30 hover:border-primary/50 focus:border-primary transition-all rounded-xl" />
                  <InputOTPSlot index={4} className="h-14 w-14 text-2xl font-bold border-2 border-primary/30 hover:border-primary/50 focus:border-primary transition-all rounded-xl" />
                  <InputOTPSlot index={5} className="h-14 w-14 text-2xl font-bold border-2 border-primary/30 hover:border-primary/50 focus:border-primary transition-all rounded-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleVerifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
                data-testid="verify-2fa-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable"
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCancelVerification}
                disabled={loading}
                data-testid="cancel-2fa-button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={is2FAEnabled ? "border-green-500/20 bg-green-50/50 dark:bg-green-950/20" : "border-muted"}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-full p-2 ${is2FAEnabled ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
            {is2FAEnabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Email Two-Factor Authentication
                {is2FAEnabled && (
                  <span className="text-xs font-normal text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </h3>
              <CardDescription className="mt-1">
                {is2FAEnabled 
                  ? "Your account is protected with email-based two-factor authentication"
                  : "Add an extra layer of security by requiring a verification code sent to your email"
                }
              </CardDescription>
            </div>

            {is2FAEnabled && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 p-3 rounded-lg">
                <Mail className="h-4 w-4" />
                <span>{email}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {is2FAEnabled ? (
                <Button
                  variant="destructive"
                  onClick={handleDisable2FA}
                  disabled={loading}
                  data-testid="disable-2fa-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    "Disable 2FA"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleEnable2FA}
                  disabled={loading}
                  data-testid="enable-2fa-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Enable 2FA
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {!is2FAEnabled && (
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              We strongly recommend enabling 2FA to protect your account from unauthorized access.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}