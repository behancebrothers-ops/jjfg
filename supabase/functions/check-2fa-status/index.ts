import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from '../_shared/logger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateAuth, authErrorResponse } from '../_shared/authHelper.ts';

const logger = createLogger('check-2fa-status');

interface Check2FARequest {
  userId: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication using shared helper
    const authResult = await validateAuth(req);
    
    if (authResult.error || !authResult.user) {
      // For 2FA status check, return enabled: false if session expired
      if (authResult.isExpired) {
        return new Response(
          JSON.stringify({ enabled: false, sessionExpired: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return authErrorResponse(authResult, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let userId: string;
    
    try {
      const body = await req.json();
      userId = body.userId;
    } catch {
      // If no body, use authenticated user's ID
      userId = authResult.user.id;
    }

    // Verify the authenticated user matches the userId
    if (userId && authResult.user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Cannot check another user\'s 2FA status', enabled: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = userId || authResult.user.id;
    logger.info('Checking 2FA status', { userId: targetUserId });

    const { data: settings, error } = await supabase
      .from('user_2fa_settings')
      .select('enabled, email')
      .eq('user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      logger.error('Error checking 2FA status', error, { userId: targetUserId });
      throw error;
    }

    const enabled = settings?.enabled || false;
    const email = settings?.email || null;

    logger.info('2FA status retrieved', { userId: targetUserId, enabled });

    return new Response(
      JSON.stringify({ 
        enabled,
        email,
        success: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    logger.error('Unhandled error in check-2fa-status', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to check 2FA status',
        enabled: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
