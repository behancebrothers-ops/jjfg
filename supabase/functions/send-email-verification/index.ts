import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createLogger } from '../_shared/logger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { renderEmail } from '../_shared/templates.ts';

const logger = createLogger('send-email-verification');

const SendVerificationSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }).max(255),
});

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const validationResult = SendVerificationSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validationResult.error.errors }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const { email } = validationResult.data;

    logger.info('Sending email verification OTP', { email });

    // Check rate limiting for this email
    const { data: rateLimit } = await supabase.rpc('check_otp_rate_limit', {
      p_identifier: email,
      p_otp_type: 'email_verification',
      p_max_requests: 5,
      p_window_minutes: 15,
      p_lockout_minutes: 30
    });

    if (rateLimit && rateLimit[0]?.is_blocked) {
      const blockedUntil = rateLimit[0].blocked_until;
      logger.warn('Rate limit exceeded for email verification', { email, blockedUntil });
      return new Response(
        JSON.stringify({
          error: 'Too many verification requests. Please try again later.',
          blocked_until: blockedUntil
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      );
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any existing unexpired codes for this email
    await supabase
      .from('email_verification_codes')
      .delete()
      .eq('email', email)
      .eq('verified', false);

    // Store the code in the database
    const { error: insertError } = await supabase
      .from('email_verification_codes')
      .insert({
        email: email,
        code: code,
        expires_at: expiresAt,
        verified: false
      });

    if (insertError) {
      logger.error('Failed to store verification code', insertError, { email });
      throw insertError;
    }

    // Update rate limit tracking
    await supabase
      .from('otp_rate_limits')
      .upsert({
        identifier: email,
        otp_type: 'email_verification',
        request_count: (rateLimit?.[0]?.remaining_requests ?? 5) > 0 ?
          (6 - (rateLimit?.[0]?.remaining_requests ?? 5)) : 5,
        first_request_at: new Date().toISOString(),
        last_request_at: new Date().toISOString()
      }, {
        onConflict: 'identifier,otp_type'
      });

    // Send email with the code
    const { subject: renderedSubject, html: renderedHtml } = await renderEmail(supabase, "Verification Code", {
      code: code,
    });

    const { error: emailError } = await resend.emails.send({
      from: 'Luxee Store <hello@verification.luxee.store>',
      to: [email],
      subject: renderedSubject,
      html: renderedHtml,
    });

    if (emailError) {
      logger.error('Failed to send verification email', emailError, { email });
      throw emailError;
    }

    logger.info('Email verification code sent successfully', { email });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent to your email'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    logger.error('Unhandled error in send-email-verification', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to send verification code'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
