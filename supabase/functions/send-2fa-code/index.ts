import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createLogger } from '../_shared/logger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const logger = createLogger('send-2fa-code');

const SendCodeSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  email: z.string().email({ message: "Invalid email format" }).max(255),
  type: z.enum(['enable', 'login'])
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key to validate the user - this bypasses JWT verification issues
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Create a client with user's auth header for getUser
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Try to get the user from the token
    const token = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    let userEmail: string | null = null;

    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

      if (userError) {
        logger.warn('User verification failed', { error: userError.message });

        // Check if it's an expired token error
        if (userError.message.includes('expired') ||
          userError.message.includes('invalid') ||
          userError.message.includes('JWT')) {
          return new Response(
            JSON.stringify({
              error: 'Session expired. Please sign in again.',
              code: 'SESSION_EXPIRED'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Unauthorized', code: 'AUTH_FAILED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!userData?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', code: 'NO_USER' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = userData.user.id;
      userEmail = userData.user.email || null;
    } catch (authError: any) {
      logger.error('Auth error', authError);
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          code: 'AUTH_ERROR'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = SendCodeSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validationResult.error.errors }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const { userId: requestedUserId, email, type } = validationResult.data;

    // Verify the authenticated user matches the userId in the request
    if (userId !== requestedUserId) {
      logger.warn('User ID mismatch', { authUserId: userId, requestUserId: requestedUserId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot send code for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Generating 2FA code', { userId, type });

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      logger.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'Email service not configured. Please contact support.',
          code: 'EMAIL_NOT_CONFIGURED'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any existing unexpired codes for this user
    await supabaseService
      .from('user_2fa_codes')
      .delete()
      .eq('user_id', userId)
      .eq('verified', false);

    // Store the code in the database
    const { error: insertError } = await supabaseService
      .from('user_2fa_codes')
      .insert({
        user_id: userId,
        code: code,
        expires_at: expiresAt,
        verified: false
      });

    if (insertError) {
      logger.error('Failed to store 2FA code', insertError, { userId });
      throw new Error('Failed to generate verification code');
    }

    // Send email with the code
    const subject = type === 'enable'
      ? 'Enable Two-Factor Authentication - Luxees'
      : 'Your Login Verification Code - Luxees';

    const message = type === 'enable'
      ? `Your verification code to enable two-factor authentication is:`
      : `Your login verification code is:`;

    try {
      const { error: emailError } = await resend.emails.send({
        from: 'Luxee Security <security@verification.luxee.store>',
        to: [email],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Two-Factor Authentication</h2>
            <p style="font-size: 16px; color: #555;">${message}</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="font-size: 32px; letter-spacing: 5px; color: #d97706; margin: 0;">${code}</h1>
            </div>
            <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
            <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999;">This is an automated security message from Luxees.</p>
          </div>
        `,
      });

      if (emailError) {
        logger.error('Failed to send 2FA email', emailError, { userId, type });
        throw new Error('Failed to send verification email');
      }
    } catch (emailErr: any) {
      logger.error('Email sending error', emailErr);
      return new Response(
        JSON.stringify({
          error: 'Failed to send verification email. Please try again.',
          code: 'EMAIL_SEND_FAILED'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('2FA code sent successfully', { userId, type });

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
    logger.error('Unhandled error in send-2fa-code', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send verification code. Please try again.',
        code: 'INTERNAL_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
