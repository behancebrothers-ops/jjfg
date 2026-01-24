import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');

const resend = new Resend(RESEND_API_KEY);

const LockoutRequestSchema = z.object({
  email: z.string().email(),
  reason: z.enum(['email_blocked', 'ip_blocked', 'device_blocked']),
  blockedUntil: z.string(),
  ipAddress: z.string().optional(),
  attemptCount: z.number().optional(),
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validatedData = LockoutRequestSchema.parse(body);

    const { email, reason, blockedUntil, ipAddress, attemptCount } = validatedData;

    console.log(`Sending lockout notification to ${email} for reason: ${reason}`);

    const blockedDate = new Date(blockedUntil);
    const minutesBlocked = Math.ceil((blockedDate.getTime() - Date.now()) / 60000);

    let reasonText = '';
    let securityTip = '';

    switch (reason) {
      case 'email_blocked':
        reasonText = 'multiple failed login attempts with your email address';
        securityTip = 'If you forgot your password, please use the password reset option instead of trying multiple times.';
        break;
      case 'ip_blocked':
        reasonText = 'multiple failed login attempts from your location';
        securityTip = 'If you\'re on a shared network, this might affect other users. Please ensure you\'re using the correct credentials.';
        break;
      case 'device_blocked':
        reasonText = 'multiple failed login attempts from this device';
        securityTip = 'If this wasn\'t you, your device might be compromised. Consider running a security scan.';
        break;
    }

    const subject = '🔒 Security Alert: Account Temporarily Locked';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 2px solid #ef4444;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin: 0 0 10px;">🔒</div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">Security Alert</h1>
              <p style="color: #fecaca; font-size: 16px; margin: 10px 0 0;">Account Temporarily Locked</p>
            </div>
            
            <div style="padding: 30px;">
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 0 0 25px; border-radius: 4px;">
                <p style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0 0 10px;">⚠️ Your account has been temporarily locked</p>
                <p style="color: #7f1d1d; font-size: 14px; line-height: 24px; margin: 0;">
                  We detected ${reasonText}. To protect your account, we've temporarily restricted access.
                </p>
              </div>

              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h2 style="color: #333; font-size: 18px; font-weight: 600; margin: 0 0 15px;">Lockout Details</h2>
                <p style="color: #666; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  <strong>Account:</strong> ${email}
                </p>
                ${attemptCount ? `
                <p style="color: #666; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  <strong>Failed Attempts:</strong> ${attemptCount}
                </p>
                ` : ''}
                ${ipAddress && ipAddress !== 'unknown' ? `
                <p style="color: #666; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  <strong>IP Address:</strong> ${ipAddress}
                </p>
                ` : ''}
                <p style="color: #666; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  <strong>Lockout Duration:</strong> ${minutesBlocked} minutes
                </p>
                <p style="color: #666; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  <strong>Access Restored At:</strong> ${blockedDate.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })}
                </p>
              </div>

              <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 10px;">🛡️ What You Should Do</h3>
                <p style="color: #1e3a8a; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  1. <strong>Wait for the lockout period to expire</strong> (${minutesBlocked} minutes from now)
                </p>
                <p style="color: #1e3a8a; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  2. <strong>Verify you're using the correct password</strong> before attempting to login again
                </p>
                <p style="color: #1e3a8a; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  3. <strong>If you forgot your password,</strong> use the "Forgot Password" option on the login page
                </p>
                <p style="color: #1e3a8a; font-size: 14px; line-height: 24px; margin: 8px 0;">
                  4. <strong>Contact support</strong> if you believe this is an error or if you need immediate access
                </p>
              </div>

              <div style="background-color: #fefce8; border: 1px solid #facc15; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="color: #854d0e; font-size: 14px; line-height: 24px; margin: 0;">
                  <strong>💡 Security Tip:</strong> ${securityTip}
                </p>
              </div>

              <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; margin-top: 30px;">
                <h3 style="color: #333; font-size: 16px; font-weight: 600; margin: 0 0 15px;">Wasn't You?</h3>
                <p style="color: #666; font-size: 14px; line-height: 24px; margin: 0 0 15px;">
                  If you didn't attempt to login, someone may be trying to access your account. We recommend:
                </p>
                <ul style="color: #666; font-size: 14px; line-height: 24px; margin: 0; padding-left: 20px;">
                  <li style="margin: 8px 0;">Change your password immediately after the lockout expires</li>
                  <li style="margin: 8px 0;">Enable two-factor authentication for added security</li>
                  <li style="margin: 8px 0;">Review your recent account activity</li>
                  <li style="margin: 8px 0;">Contact our support team if you suspect unauthorized access</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${req.headers.get('origin')}/contact" style="background-color: #667eea; border-radius: 6px; color: #fff; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block; padding: 14px 40px;">
                  Contact Support
                </a>
              </div>

              <p style="color: #666; font-size: 14px; line-height: 24px; margin: 25px 0 0; text-align: center; font-style: italic;">
                Your security is our top priority
              </p>
            </div>

            <div style="border-top: 1px solid #e6ebf1; padding: 20px 30px; background-color: #f9fafb;">
              <p style="color: #6b7280; font-size: 12px; line-height: 18px; margin: 5px 0; text-align: center;">
                This is an automated security notification from Luxee Store
              </p>
              <p style="color: #6b7280; font-size: 12px; line-height: 18px; margin: 5px 0; text-align: center;">
                Email sent to: ${email}
              </p>
              <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 5px 0; text-align: center;">
                © ${new Date().getFullYear()} Luxee Store. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Luxee Security <security@verification.luxee.store>',
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Lockout notification sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error sending lockout notification:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request data", details: error.errors }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send notification' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
