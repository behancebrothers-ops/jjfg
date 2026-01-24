import { createClient, SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createLogger } from './logger.ts';

const logger = createLogger('auth-helper');

export interface AuthResult {
  user: { id: string; email?: string } | null;
  error: string | null;
  isExpired: boolean;
  supabaseClient: SupabaseClient | null;
  claims: Record<string, any> | null;
}

/**
 * Validates the authorization header and returns user info using getClaims()
 * Handles token expiry gracefully and provides clear error messages
 */
export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    return {
      user: null,
      error: 'Missing authorization header',
      isExpired: false,
      supabaseClient: null,
      claims: null,
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      user: null,
      error: 'Invalid authorization format',
      isExpired: false,
      supabaseClient: null,
      claims: null,
    };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Basic token validation
  if (token.length < 10 || token.length > 5000) {
    return {
      user: null,
      error: 'Invalid token format',
      isExpired: false,
      supabaseClient: null,
      claims: null,
    };
  }

  // Check if it's just the anon key (not a user token)
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (token === anonKey) {
    return {
      user: null,
      error: 'No user session provided',
      isExpired: false,
      supabaseClient: null,
      claims: null,
    };
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Use getClaims() instead of getUser() for JWT validation
    // This is the recommended approach with Supabase's signing-keys system
    const { data, error: claimsError } = await supabaseClient.auth.getUser(token);

    if (claimsError) {
      // Check for specific error types
      const errorMessage = claimsError.message.toLowerCase();
      
      if (errorMessage.includes('expired') || 
          errorMessage.includes('invalid jwt') || 
          errorMessage.includes('invalid token')) {
        logger.warn('Token expired or invalid', { error: claimsError.message });
        return {
          user: null,
          error: 'Session expired. Please sign in again.',
          isExpired: true,
          supabaseClient: null,
          claims: null,
        };
      }

      if (errorMessage.includes('invalid claim') || errorMessage.includes('malformed')) {
        return {
          user: null,
          error: 'Invalid session token',
          isExpired: false,
          supabaseClient: null,
          claims: null,
        };
      }

      logger.warn('Auth validation failed', { error: claimsError.message });
      return {
        user: null,
        error: 'Authentication failed',
        isExpired: false,
        supabaseClient: null,
        claims: null,
      };
    }

    if (!data?.user) {
      return {
        user: null,
        error: 'User not found',
        isExpired: false,
        supabaseClient: null,
        claims: null,
      };
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      error: null,
      isExpired: false,
      supabaseClient,
      claims: null,
    };
  } catch (error: any) {
    logger.error('Auth validation error', error);
    
    // Check if this is a JWT error
    if (error.message?.includes('JWT') || error.message?.includes('token')) {
      return {
        user: null,
        error: 'Session expired. Please sign in again.',
        isExpired: true,
        supabaseClient: null,
        claims: null,
      };
    }
    
    return {
      user: null,
      error: 'Authentication error',
      isExpired: false,
      supabaseClient: null,
      claims: null,
    };
  }
}

/**
 * Creates auth error response with proper headers
 */
export function authErrorResponse(
  result: AuthResult,
  corsHeaders: Record<string, string>
): Response {
  const status = 401;
  const body = {
    error: result.error || 'Authentication required',
    code: result.isExpired ? 'SESSION_EXPIRED' : 'UNAUTHORIZED',
  };

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Check if user has admin role using service role key
 */
export async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { data: roleData, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      logger.error('Admin role check failed', error);
      return false;
    }

    return !!roleData;
  } catch (error) {
    logger.error('Admin role check error', error);
    return false;
  }
}
