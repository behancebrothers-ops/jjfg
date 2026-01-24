import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createLogger } from '../_shared/logger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  checkCombinedRateLimit,
  rateLimitExceededResponse,
  RATE_LIMITS
} from "../_shared/rateLimit.ts";

const logger = createLogger('verify-2fa-code');

const VerifyCodeSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  code: z.string().length(6, { message: "Code must be 6 digits" }).regex(/^\d+$/, { message: "Code must contain only digits" })
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Strict rate limiting for 2FA verification to prevent brute force
    const rateLimitResult = await checkCombinedRateLimit(req, 'verify-2fa-code', RATE_LIMITS.AUTH_STRICT);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for verify-2fa-code');
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    // Check for authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', valid: false, code: 'NO_AUTH' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with user's auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Service role client for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate user token
    const token = authHeader.replace('Bearer ', '');
    let authUserId: string;

    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (userError) {
        logger.warn('User verification failed', { error: userError.message });
        
        if (userError.message.includes('expired') || 
            userError.message.includes('invalid') ||
            userError.message.includes('JWT')) {
          return new Response(
            JSON.stringify({ 
              error: 'Session expired. Please sign in again.',
              valid: false,
              code: 'SESSION_EXPIRED'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Unauthorized', valid: false }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!userData?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', valid: false }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = userData.user.id;
    } catch (authError: any) {
      logger.error('Auth error', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const validationResult = VerifyCodeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validationResult.error.errors, valid: false }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { userId, code } = validationResult.data;

    // Verify the authenticated user matches the userId
    if (authUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot verify code for another user', valid: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Verifying 2FA code', { userId });

    // Find the most recent valid code for this user
    const { data: codeData, error: fetchError } = await supabaseService
      .from('user_2fa_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !codeData) {
      logger.warn('Invalid or expired 2FA code attempt', { userId });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired verification code',
          valid: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Mark the code as verified
    const { error: updateError } = await supabaseService
      .from('user_2fa_codes')
      .update({ verified: true })
      .eq('id', codeData.id);

    if (updateError) {
      logger.error('Failed to mark code as verified', updateError, { userId });
      throw updateError;
    }

    // Delete all other codes for this user
    await supabaseService
      .from('user_2fa_codes')
      .delete()
      .eq('user_id', userId)
      .neq('id', codeData.id);

    logger.info('2FA code verified successfully', { userId });

    return new Response(
      JSON.stringify({ 
        success: true,
        valid: true,
        message: 'Code verified successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    logger.error('Unhandled error in verify-2fa-code', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to verify code',
        valid: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
