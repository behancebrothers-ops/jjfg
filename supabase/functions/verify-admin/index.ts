import { getCorsHeaders } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { validateAuth, authErrorResponse, checkAdminRole } from '../_shared/authHelper.ts';
import {
  checkCombinedRateLimit,
  rateLimitExceededResponse,
  RATE_LIMITS
} from "../_shared/rateLimit.ts";

const logger = createLogger('verify-admin');

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit check
    const rateLimitResult = await checkCombinedRateLimit(req, 'verify-admin', RATE_LIMITS.AUTH_NORMAL);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for verify-admin');
      return rateLimitExceededResponse(rateLimitResult, corsHeaders);
    }

    // Validate authentication using shared helper
    const authResult = await validateAuth(req);
    
    if (authResult.error || !authResult.user) {
      // For verify-admin, we want to return 200 with isAdmin: false for expired sessions
      // This prevents infinite redirect loops on the client
      if (authResult.isExpired) {
        logger.info('Session expired, returning non-admin status');
        return new Response(
          JSON.stringify({ 
            isAdmin: false, 
            sessionExpired: true,
            error: 'Session expired'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: authResult.error || 'Authentication failed', 
          isAdmin: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('User authenticated successfully', { userId: authResult.user.id });

    // Check admin role using service role key
    const isAdmin = await checkAdminRole(authResult.user.id);
    
    logger.info('Admin check completed', { userId: authResult.user.id, isAdmin });

    return new Response(
      JSON.stringify({ 
        isAdmin,
        userId: authResult.user.id,
        email: authResult.user.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Unhandled error in verify-admin', error);
    return new Response(
      JSON.stringify({ error: 'Internal error', isAdmin: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
