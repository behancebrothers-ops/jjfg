import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Smartphone, Key } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TwoFactorSetup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string>("");

  const check2FAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find(f => f.status === 'verified');
      
      if (totpFactor) {
        setIs2FAEnabled(true);
        setFactorId(totpFactor.id);
      } else {
        setIs2FAEnabled(false);
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setLoading(true);
      setEnrolling(true);

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        
        toast({
          title: "2FA Setup Started",
          description: "Scan the QR code with your authenticator app.",
        });
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to enable 2FA. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factorId,
        code: verifyCode
      });

      if (error) throw error;

      setIs2FAEnabled(true);
      setEnrolling(false);
      setQrCode("");
      setSecret("");
      setVerifyCode("");

      toast({
        title: "2FA Enabled!",
        description: "Two-factor authentication has been successfully enabled.",
      });
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factorId
      });

      if (error) throw error;

      setIs2FAEnabled(false);
      setFactorId("");

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to disable 2FA. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEnrollment = () => {
    setEnrolling(false);
    setQrCode("");
    setSecret("");
    setVerifyCode("");
  };

  // Check 2FA status on mount
  useState(() => {
    check2FAStatus();
  });

  if (enrolling && qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Set Up 2FA
          </CardTitle>
          <CardDescription>
            Scan this QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              Use apps like Google Authenticator, Authy, or 1Password to scan this code.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center p-4 bg-white rounded-lg">
            <img 
              src={qrCode} 
              alt="2FA QR Code" 
              className="w-64 h-64"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Or enter this key manually:</Label>
            <div className="p-3 bg-muted rounded-md">
              <code className="text-sm break-all">{secret}</code>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verify-code">Verification Code</Label>
            <Input
              id="verify-code"
              type="text"
              placeholder="Enter 6-digit code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleVerifyAndEnable} 
              disabled={loading || verifyCode.length !== 6}
              className="flex-1"
            >
              {loading ? "Verifying..." : "Verify & Enable"}
            </Button>
            <Button 
              onClick={handleCancelEnrollment} 
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {is2FAEnabled ? (
          <>
            <Alert className="border-green-500 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Two-factor authentication is enabled and protecting your account.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleDisable2FA} 
              variant="destructive"
              disabled={loading}
            >
              {loading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </>
        ) : (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is not enabled. Enable it now to secure your account.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleEnable2FA} 
              disabled={loading}
            >
              {loading ? "Setting up..." : "Enable 2FA"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
