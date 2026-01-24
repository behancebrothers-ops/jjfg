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

const logger = createLogger('toggle-2fa');

const Toggle2FASchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID format" }),
  email: z.string().email({ message: "Invalid email format" }).max(255, "Email too long"),
  enabled: z.boolean()
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check
    const rateLimitResult = await checkCombinedRateLimit(req, 'toggle-2fa', RATE_LIMITS.AUTH_STRICT);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for toggle-2fa');
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const validationResult = Toggle2FASchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validationResult.error.errors }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { userId, email, enabled } = validationResult.data;

    // Verify the authenticated user matches the userId
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot modify another user\'s 2FA settings' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Toggling 2FA', { userId, enabled });

    // Check if settings already exist
    const { data: existingSettings } = await supabase
      .from('user_2fa_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from('user_2fa_settings')
        .update({ enabled, email })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('Error updating 2FA settings', updateError, { userId });
        throw updateError;
      }
    } else {
      // Insert new settings
      const { error: insertError } = await supabase
        .from('user_2fa_settings')
        .insert({
          user_id: userId,
          enabled,
          email
        });

      if (insertError) {
        logger.error('Error inserting 2FA settings', insertError, { userId });
        throw insertError;
      }
    }

    // If disabling, clean up any pending codes
    if (!enabled) {
      await supabase
        .from('user_2fa_codes')
        .delete()
        .eq('user_id', userId);
    }

    logger.info('2FA toggle successful', { userId, enabled });

    return new Response(
      JSON.stringify({ 
        success: true,
        enabled,
        message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    logger.error('Unhandled error in toggle-2fa', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update 2FA settings'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
